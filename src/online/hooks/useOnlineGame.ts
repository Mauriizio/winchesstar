import { useEffect, useMemo, useSyncExternalStore } from "react";
import { OnlineGameController } from "../OnlineGameController";

export function useOnlineGame(id: string, userId: string) {
  // Create the controller in the effect so StrictMode's setup/cleanup/setup gets a fresh instance.
  const bridge = useMemo(() => {
    let controller = new OnlineGameController(id, userId);
    const listeners = new Set<() => void>();
    let unsubscribe = () => {};
    return {
      subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
      getSnapshot: () => controller.getSnapshot(),
      start: () => {
        controller = new OnlineGameController(id, userId);
        unsubscribe = controller.subscribe(() => listeners.forEach((fn) => fn()));
        controller.start();
      },
      stop: () => { unsubscribe(); controller.dispose(); },
      act: (action: Parameters<OnlineGameController["act"]>[0]) => controller.act(action),
      sync: () => controller.sync(),
    };
  }, [id, userId]);
  const state = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
  useEffect(() => { bridge.start(); return bridge.stop; }, [bridge]);
  return { ...state, act: bridge.act, sync: bridge.sync };
}
