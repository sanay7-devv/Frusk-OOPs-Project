import { useSyncExternalStore } from 'react';
import type { DashboardEvent } from '../api/dashboard';

/** State of the STOMP connection, shown by the status pill in the app shell. */
export type RealtimeStatus = 'off' | 'connecting' | 'connected' | 'reconnecting';

interface Snapshot {
  status: RealtimeStatus;
  /** Newest first, only filled for administrators (the `/topic/dashboard` subscription). */
  events: DashboardEvent[];
  /** Time of the last STOMP message, null before the first one. */
  lastMessageAt: number | null;
}

const MAX_EVENTS = 30;
let snap: Snapshot = { status: 'off', events: [], lastMessageAt: null };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const realtimeStore = {
  setStatus(status: RealtimeStatus) {
    if (snap.status === status) return;
    snap = { ...snap, status };
    emit();
  },
  pushEvent(e: DashboardEvent) {
    snap = { ...snap, events: [e, ...snap.events].slice(0, MAX_EVENTS), lastMessageAt: Date.now() };
    emit();
  },
  touch() {
    snap = { ...snap, lastMessageAt: Date.now() };
    emit();
  },
  reset() {
    snap = { status: 'off', events: [], lastMessageAt: null };
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  get: () => snap,
};

const useSnapshot = () => useSyncExternalStore(realtimeStore.subscribe, realtimeStore.get);

export const useRealtimeStatus = () => useSnapshot().status;
export const useLiveEvents = () => useSnapshot().events;
export const useLastMessageAt = () => useSnapshot().lastMessageAt;
