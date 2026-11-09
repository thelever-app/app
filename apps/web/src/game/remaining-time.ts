import { useSyncExternalStore } from 'react';

/** One tick a second for every countdown on screen, and none while nobody shows one. */
const listeners = new Set<() => void>();
let ticking: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  ticking ??= setInterval(() => listeners.forEach((notify) => notify()), 1000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && ticking !== undefined) {
      clearInterval(ticking);
      ticking = undefined;
    }
  };
}

function currentSecond(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * How far the clock of the server is ahead of the one of the device, measured when each state
 * first arrives, so the countdown of every device ends with the one of the server.
 */
const offsets = new Map<string, number>();

function offsetFor(serverTime: string): number {
  let offset = offsets.get(serverTime);
  if (offset === undefined) {
    offset = Date.parse(serverTime) - Date.now();
    offsets.clear();
    offsets.set(serverTime, offset);
  }
  return offset;
}

/** The whole seconds left until `endsAt`, by the clock of the server; 0 once it is over. */
export function useRemainingSeconds(endsAt: string, serverTime: string): number {
  const second = useSyncExternalStore(subscribe, currentSecond);
  const serverNow = second * 1000 + offsetFor(serverTime);
  return Math.max(0, Math.ceil((Date.parse(endsAt) - serverNow) / 1000));
}

/** As the header shows it: m:ss. */
export function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
