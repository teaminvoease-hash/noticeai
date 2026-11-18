import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
export interface ClientUpdate {
  _id: string;
  noticeId?: string;
  matterId?: string;
  section: string;
  message: string;
  status: string;
  createdAt: string;
}
interface Feed {
  items: ClientUpdate[];
  unreadCount: number;
  error: string;
  loaded: boolean;
}
const empty: Feed = { items: [], unreadCount: 0, error: "", loaded: false };
let state = empty,
  running = false,
  timer: ReturnType<typeof setTimeout> | undefined,
  controller: AbortController | undefined;
const listeners = new Set<() => void>();
const publish = (next: Feed) => {
  state = next;
  listeners.forEach((fn) => fn());
};
export async function refreshNotifications() {
  if (running || !listeners.size || document.visibilityState === "hidden")
    return;
  running = true;
  const current = new AbortController();
  controller = current;
  try {
    const data = await api<{ items: ClientUpdate[]; unreadCount: number }>(
      "/api/client-portal/notification-feed",
      "GET",
      undefined,
      current.signal,
    );
    if (!current.signal.aborted) publish({ ...data, error: "", loaded: true });
  } catch (e) {
    if (!current.signal.aborted)
      publish({
        ...state,
        error: e instanceof Error ? e.message : "Updates could not refresh.",
      });
  } finally {
    running = false;
    if (listeners.size) {
      clearTimeout(timer);
      timer = setTimeout(refreshNotifications, 5000);
    }
  }
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", refreshNotifications);
    window.addEventListener("focus", refreshNotifications);
    void refreshNotifications();
  }
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      clearTimeout(timer);
      controller?.abort();
      state = empty;
      document.removeEventListener("visibilitychange", refreshNotifications);
      window.removeEventListener("focus", refreshNotifications);
    }
  };
}
export function useClientUpdates(enabled = true) {
  const feed = useSyncExternalStore(enabled ? subscribe : () => () => {}, () =>
    enabled ? state : empty,
  );
  useEffect(() => {
    if (enabled) void refreshNotifications();
  }, [enabled]);
  return feed;
}
