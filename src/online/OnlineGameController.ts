import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ConnectionStatus, GameAction, GameSnapshot } from "./types";
import { getSupabase } from "./supabase";
import { loadGame, sendAction } from "./games";
import { onlineError } from "./errors";
import { reconstruct } from "./state";
import type { Game } from "../domain/game";

export type ControllerState = {
  snapshot: GameSnapshot | null;
  game: Game | null;
  connection: ConnectionStatus;
  syncing: boolean;
  pending: boolean;
  opponentOnline: boolean;
  error: string | null;
};

/** All network state lives here. Board and GameView only emit typed intentions. */
export class OnlineGameController {
  private state: ControllerState = { snapshot: null, game: null, connection: "connecting", syncing: true, pending: false, opponentOnline: false, error: null };
  private listeners = new Set<() => void>();
  private channel: RealtimeChannel | null = null;
  private disposed = false;
  private loading = false;
  private dirty = false;
  private subscribed = false;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private failures = 0;
  constructor(readonly id: string, readonly userId: string) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<ControllerState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private accept(snapshot: GameSnapshot) {
    if (this.state.snapshot && snapshot.game.revision < this.state.snapshot.game.revision) return;
    const same = this.state.snapshot?.game.revision === snapshot.game.revision;
    const game = same ? this.state.game : reconstruct(snapshot);
    this.publish({ snapshot, game });
    this.updatePresence();
  }
  sync = async () => {
    if (this.disposed) return;
    if (this.loading) { this.dirty = true; return; }
    if (!navigator.onLine) { this.offline(); return; }
    this.loading = true;
    this.publish({ syncing: true });
    clearTimeout(this.retry);
    try {
      this.accept(await loadGame(this.id));
      this.failures = 0;
      this.publish({ syncing: false, connection: this.subscribed ? "online" : "connecting", error: null });
    } catch (error) {
      this.publish({ syncing: false, connection: "reconnecting", error: onlineError(error) });
      // Backoff is recovery only, never a regular polling loop.
      if (!this.disposed) this.retry = setTimeout(() => void this.sync(), Math.min(30000, 1000 * 2 ** this.failures++));
    } finally {
      this.loading = false;
      if (this.dirty) { this.dirty = false; void this.sync(); }
    }
  };
  private offline = () => this.publish({ connection: "offline", opponentOnline: false });
  private online = () => { this.publish({ connection: "reconnecting" }); void this.sync(); };
  private visible = () => { if (document.visibilityState === "visible") void this.sync(); };
  private updatePresence = () => {
    const game = this.state.snapshot?.game;
    if (!game || !this.channel) return;
    const opponent = game.white_player_id === this.userId ? game.black_player_id : game.white_player_id;
    const presence = this.channel.presenceState();
    this.publish({ opponentOnline: !!opponent && (presence[opponent]?.length ?? 0) > 0 });
  };
  start() {
    const client = getSupabase();
    this.channel = client.channel(`game:${this.id}`, { config: { private: true, presence: { key: this.userId } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${this.id}` }, () => void this.sync())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_moves", filter: `game_id=eq.${this.id}` }, () => void this.sync())
      .on("presence", { event: "sync" }, this.updatePresence)
      .subscribe((status) => {
        if (this.disposed) return;
        this.subscribed = status === "SUBSCRIBED";
        if (this.subscribed) {
          void this.channel?.track({ online_at: new Date().toISOString() }).catch(() => this.publish({ opponentOnline: false }));
          void this.sync(); // Always reconcile after subscribing/rejoining, even when no event was delivered.
        } else this.publish({ connection: navigator.onLine ? "reconnecting" : "offline", opponentOnline: false });
      });
    window.addEventListener("offline", this.offline);
    window.addEventListener("online", this.online);
    document.addEventListener("visibilitychange", this.visible);
    void this.sync();
  }
  act = async (action: GameAction) => {
    const row = this.state.snapshot?.game;
    if (!row || this.state.pending || this.state.syncing || this.state.connection !== "online") return;
    this.publish({ pending: true, error: null });
    try {
      const official = await sendAction({ gameId: row.id, expectedPly: row.current_ply, expectedRevision: row.revision, action });
      this.accept(official);
    } catch (error) {
      // Includes an ambiguous network timeout: reload, never replay the user's move blindly.
      await this.sync();
      this.publish({ error: onlineError(error) });
    } finally { this.publish({ pending: false }); }
  };
  dispose() {
    this.disposed = true;
    clearTimeout(this.retry);
    window.removeEventListener("offline", this.offline);
    window.removeEventListener("online", this.online);
    document.removeEventListener("visibilitychange", this.visible);
    if (this.channel) void getSupabase().removeChannel(this.channel).catch(() => undefined);
    this.listeners.clear();
  }
}
