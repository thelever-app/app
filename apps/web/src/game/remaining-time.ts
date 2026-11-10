import type { GameStateDto } from '@thelever-app/protocol';
import { useSyncExternalStore } from 'react';

/**
 * One tick a second for every countdown on screen, and none while nobody shows one. The ticks start
 * when the second of the device changes, so no two fall in the same second and none is skipped.
 */
const listeners = new Set<() => void>();
let stopTicking: (() => void) | undefined;

function startTicking(): () => void {
  const notify = () => listeners.forEach((listener) => listener());
  let interval: ReturnType<typeof setInterval> | undefined;
  const aligned = setTimeout(
    () => {
      notify();
      interval = setInterval(notify, 1000);
    },
    1000 - (Date.now() % 1000),
  );
  return () => {
    clearTimeout(aligned);
    clearInterval(interval);
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  stopTicking ??= startTicking();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stopTicking !== undefined) {
      stopTicking();
      stopTicking = undefined;
    }
  };
}

function currentSecond(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * How far the clock of the server is ahead of the one of the device, measured when each state
 * arrives, so the countdown of every device ends with the one of the server.
 */
const offsets = new Map<string, number>();

/** A state from the server has just arrived: how far its clock is ahead is measured now. */
export function noteServerTime(serverTime: string): void {
  offsetFor(serverTime);
}

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
  return secondsLeftAt(second, endsAt, serverTime);
}

/** Nothing ticks while there is no game: the lobby has no time to count. */
function subscribeNever(): () => void {
  return () => {};
}

/**
 * The whole seconds left for the dilemma of the round of `game`, as `useRemainingSeconds` counts
 * them; undefined while there is no game, which keeps the clock still.
 */
export function useSecondsLeft(
  game: Pick<GameStateDto, 'round' | 'serverTime'> | undefined,
): number | undefined {
  const second = useSyncExternalStore(game ? subscribe : subscribeNever, currentSecond);
  return game && secondsLeftAt(second, game.round.endsAt, game.serverTime);
}

function secondsLeftAt(second: number, endsAt: string, serverTime: string): number {
  const serverNow = second * 1000 + offsetFor(serverTime);
  return Math.max(0, Math.ceil((Date.parse(endsAt) - serverNow) / 1000));
}

/** As the header shows it: m:ss. */
export function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
