import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { authorizeAction } from "../supabase/functions/_shared/authority";
import { reconstruct, playerColor } from "../src/online/state";
import type { GameAction, GameSnapshot } from "../src/online/types";

// Real PostgreSQL in WASM runs the unmodified migration, constraints, grants and RLS.
// Only Supabase-owned auth/realtime schemas are provided by this harness.
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const eve = "33333333-3333-4333-8333-333333333333";
async function asUser<T>(user: string, query: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user]);
    return (await tx.query<T>(query, params)).rows;
  });
}
async function snapshot(id: string, user = alice): Promise<GameSnapshot> {
  return (await asUser<{ value: GameSnapshot }>(user, "select public.game_snapshot($1) as value", [id]))[0].value;
}
async function create(color = "w", whiteTeam = "libertadores") {
  const [{ id }] = await asUser<{ id: string }>(alice, "select public.create_game($1,$2) as id", [color, whiteTeam]);
  return await snapshot(id);
}
async function joined(color = "w") {
  const room = await create(color);
  await asUser(bob, "select public.join_game($1)", [room.game.room_code]);
  return await snapshot(room.game.id);
}
async function commit(s: GameSnapshot, actor: string, action: GameAction) {
  const next = authorizeAction(s, actor, { gameId: s.game.id, expectedPly: s.game.current_ply, expectedRevision: s.game.revision, action });
  await db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    await tx.query("select public.commit_game_action($1,$2,$3,$4,$5)", [s.game.id, actor, s.game.current_ply, s.game.revision, JSON.stringify(next)]);
  });
  return await snapshot(s.game.id);
}
async function play(s: GameSnapshot, uci: string) {
  return commit(s, s.game.turn === "w" ? s.game.white_player_id! : s.game.black_player_id!, {
    type: "move", move: { from: uci.slice(0,2) as "e2", to: uci.slice(2,4) as "e4", ...(uci[4] ? { promotion: uci[4] as "q" } : {}) },
  });
}
async function sequence(s: GameSnapshot, moves: string[]) {
  for (const move of moves) s = await play(s, move);
  return s;
}

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema realtime;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to authenticated, service_role;
    create table realtime.messages(id bigint, extension text);
    alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/20261001095328_online_multiplayer.sql", import.meta.url), "utf8"));
  for (const [id, username] of [[alice,"Libertador"],[bob,"Realista"],[eve,"Tercero"]])
    await db.query("insert into auth.users values($1,$2)", [id, JSON.stringify({username})]);
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => { await db.exec("delete from private.request_limits"); });

describe("authoritative multiplayer on PostgreSQL", () => {
  it("creates private waiting rooms, assigns requested colors and keeps themes", async () => {
    const waiting = await create("b", "realistas");
    expect(waiting.game.status).toBe("waiting");
    expect(waiting.game.room_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(await snapshot(waiting.game.id, eve)).toBeNull();
    await asUser(bob, "select public.join_game($1)", [waiting.game.room_code]);
    const official = await snapshot(waiting.game.id);
    expect(official.game.white_player_id).toBe(bob);
    expect(official.game.black_player_id).toBe(alice);
    expect(official.game.teams.w).toBe("realistas");
    expect(playerColor(official.game, eve)).toBeNull();
  });
  it("random assigns exactly two distinct players; creator reopening never takes both seats", async () => {
    const waiting = await create("random");
    await asUser(alice, "select public.join_game($1)", [waiting.game.room_code]);
    expect((await snapshot(waiting.game.id)).game.status).toBe("waiting");
    await asUser(bob, "select public.join_game($1)", [waiting.game.room_code]);
    const s = await snapshot(waiting.game.id);
    expect(new Set([s.game.white_player_id,s.game.black_player_id])).toEqual(new Set([alice,bob]));
    await expect(asUser(eve, "select public.join_game($1)", [s.game.room_code])).rejects.toThrow("ROOM_FULL");
  });
  it("RLS and privileges prevent FEN, colors, results, forged moves, deletion and foreign reads", async () => {
    const s = await joined();
    for (const sql of ["update public.games set current_fen='fake' where id=$1", "update public.games set result='{}',current_ply=99 where id=$1", "update public.games set white_player_id=black_player_id where id=$1", "delete from public.game_moves where game_id=$1", "insert into public.game_moves(game_id) values($1)", "select public.commit_game_action($1,null,0,0,'{}')"])
      await expect(asUser(alice, sql, [s.game.id])).rejects.toThrow(/permission denied/);
    expect(await asUser(eve, "select * from public.game_moves where game_id=$1", [s.game.id])).toEqual([]);
    expect(await snapshot(s.game.id, eve)).toBeNull();
  });
  it("validates ownership, turn, legal moves, stale ply and reconstruction", async () => {
    const s = await joined();
    await expect(commit(s, bob, { type: "move", move: {from:"e7",to:"e5"} })).rejects.toThrow("NOT_YOUR_TURN");
    await expect(commit(s, eve, { type: "resign" })).rejects.toThrow("NOT_PARTICIPANT");
    await expect(commit(s, alice, { type: "move", move: {from:"e2",to:"e5"} })).rejects.toThrow("INVALID_MOVE");
    expect(() => authorizeAction(s,alice,{gameId:s.game.id,expectedPly:12,expectedRevision:s.game.revision,action:{type:"resign"}})).toThrow("STALE_STATE");
    const official = await sequence(s,["e2e4","e7e5"]);
    expect(official.moves.map((m) => m.san)).toEqual(["e4","e5"]);
    expect(reconstruct(official).rules.get("e5")?.color).toBe("b");
    expect(() => reconstruct({...official,moves:official.moves.slice(1)})).toThrow("INCONSISTENT_STATE");
  });
  it("commits only one request with the same ply/revision", async () => {
    const s = await joined();
    const responses = await Promise.allSettled([
      commit(s,alice,{type:"move",move:{from:"e2",to:"e4"}}),
      commit(s,alice,{type:"move",move:{from:"d2",to:"d4"}}),
    ]);
    expect(responses.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(responses.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await snapshot(s.game.id)).moves).toHaveLength(1);
  });
  it("castling and en passant use the shared rules and preserve official SAN", async () => {
    const castle = await sequence(await joined(),["e2e4","e7e5","g1f3","b8c6","f1c4","g8f6","e1g1"]);
    expect(castle.moves.at(-1)?.san).toBe("O-O");
    expect(reconstruct(castle).rules.get("f1")?.type).toBe("r");
    const ep = await sequence(await joined(),["e2e4","a7a6","e4e5","d7d5","e5d6"]);
    expect(reconstruct(ep).rules.get("d5")).toBeUndefined();
  });
  it.each(["q","r","b","n"])("promotion %s is complete and validated", async (promotion) => {
    const s = await joined();
    // Test-only database fixture: no API allows setting a custom FEN.
    const fen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
    await db.query("update public.games set initial_fen=$2,current_fen=$2 where id=$1",[s.game.id,fen]);
    const initial = await snapshot(s.game.id);
    await expect(play(initial,"a7a8")).rejects.toThrow("INVALID_MOVE");
    const promoted = await play(initial,`a7a8${promotion}`);
    expect(reconstruct(promoted).rules.get("a8")?.type).toBe(promotion);
  });
  it("draw offers require both players to have moved, cannot be self accepted, and expire on rival move", async () => {
    let s = await joined();
    await expect(commit(s,alice,{type:"offer-draw"})).rejects.toThrow("OFFER_UNAVAILABLE");
    s = await sequence(s,["e2e4","e7e5"]);
    s = await commit(s,alice,{type:"offer-draw"});
    await expect(commit(s,alice,{type:"accept-draw"})).rejects.toThrow("OWN_OFFER");
    const rejected = await commit(s,bob,{type:"reject-draw"});
    expect(rejected.game.draw_offer_by).toBeNull();
    s = await commit(rejected,alice,{type:"offer-draw"});
    s = await sequence(s,["g1f3","g8f6"]);
    expect(s.game.draw_offer_by).toBeNull();
    s = await commit(s,alice,{type:"offer-draw"});
    s = await commit(s,bob,{type:"accept-draw"});
    expect(s.game.result?.reason).toBe("agreement");
  });
  it("repetition claims keep full history and prospective moves are not executed", async () => {
    let s = await joined();
    const cycle = ["g1f3","g8f6","f3g1","f6g8"];
    s = await sequence(s,[...cycle,...cycle.slice(0,3)]);
    s = await commit(s,bob,{type:"claim",reason:"threefold",move:{from:"f6",to:"g8"}});
    expect(s.game.result?.reason).toBe("threefold");
    expect(s.moves).toHaveLength(7);
    expect(s.game.status).toBe("finished");
  });
  it("resignation is by the authenticated color even outside its turn; finished games are immutable", async () => {
    let s = await joined();
    s = await commit(s,bob,{type:"resign"});
    expect(s.game.result).toEqual({winner:"w",reason:"resignation"});
    await expect(play(s,"e2e4")).rejects.toThrow("FINISHED");
    await expect(asUser(eve,"select public.join_game($1)",[s.game.room_code])).rejects.toThrow("ROOM_CLOSED");
  });
  it("mate and rematch require consent and create exactly one child with inverted colors", async () => {
    const s = await sequence(await joined(),["f2f3","e7e5","g2g4","d8h4"]);
    expect(s.game.result).toEqual({winner:"b",reason:"mate"});
    const first = await asUser<{id:string|null}>(alice,"select public.request_rematch($1) as id",[s.game.id]);
    expect(first[0].id).toBeNull();
    await expect(asUser(eve,"select public.request_rematch($1)",[s.game.id])).rejects.toThrow("NOT_FOUND");
    const [{id}] = await asUser<{id:string}>(bob,"select public.request_rematch($1) as id",[s.game.id]);
    const child = await snapshot(id);
    expect(child.game.parent_game_id).toBe(s.game.id);
    expect(child.game.white_player_id).toBe(bob);
    expect(child.moves).toHaveLength(0);
    expect((await snapshot(s.game.id)).moves).toHaveLength(4);
    expect((await asUser<{id:string}>(bob,"select public.request_rematch($1) as id",[s.game.id]))[0].id).toBe(id);
  });
  it("only the creator cancels waiting rooms; active games cannot be cancelled", async () => {
    const waiting = await create();
    await expect(asUser(bob,"select public.cancel_game($1)",[waiting.game.id])).rejects.toThrow("ROOM_CLOSED");
    await asUser(alice,"select public.cancel_game($1)",[waiting.game.id]);
    await expect(asUser(bob,"select public.join_game($1)",[waiting.game.room_code])).rejects.toThrow("ROOM_CLOSED");
    const active = await joined();
    await expect(asUser(alice,"select public.cancel_game($1)",[active.game.id])).rejects.toThrow("ROOM_CLOSED");
  });
  it("profile names are unique case-insensitively, private edits cannot impersonate", async () => {
    await expect(asUser(bob,"update public.profiles set username='libertador' where id=$1",[bob])).rejects.toThrow(/unique/);
    await expect(asUser(bob,"update public.profiles set username='email@example.com' where id=$1",[bob])).rejects.toThrow(/check/);
    await asUser(bob,"update public.profiles set username='Changed' where id=$1",[alice]);
    expect((await db.query<{username:string}>("select username from public.profiles where id=$1",[alice])).rows[0].username).toBe("Libertador");
  });
});
