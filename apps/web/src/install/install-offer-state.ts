/** When the person closed the offer to install the app, and when they last finished a game. */
const CLOSED_KEY = 'thelever.installOfferClosedAt';
const FINISHED_KEY = 'thelever.lastFinishedGameAt';
/** A closed offer stays away at least this long, and until a game is finished after. */
export const OFFER_AGAIN_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

function read(storage: Storage, key: string): number | undefined {
  try {
    const value = Number(storage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function write(storage: Storage, key: string, at: number): void {
  try {
    storage.setItem(key, String(at));
  } catch {
    // A device that keeps nothing makes the offer again, which is only a notice.
  }
}

/** Whether the home screen may make the offer: never closed, or closed long ago and a game finished since. */
export function mayOffer(now: number, storage: Storage = localStorage): boolean {
  const closed = read(storage, CLOSED_KEY);
  if (closed === undefined) return true;
  const finished = read(storage, FINISHED_KEY);
  return now - closed >= OFFER_AGAIN_AFTER_MS && finished !== undefined && finished > closed;
}

export function closeOffer(now: number, storage: Storage = localStorage): void {
  write(storage, CLOSED_KEY, now);
}

export function rememberFinishedGame(now: number, storage: Storage = localStorage): void {
  write(storage, FINISHED_KEY, now);
}
