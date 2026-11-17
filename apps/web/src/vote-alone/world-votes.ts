/** Where the device keeps its vote alone of a dilemma, by the public id of the link. */
const keyOf = (publicId: string) => `thelever.worldVote.${publicId}`;

/** The storage of the device, read when it is needed: a browser that blocks it throws on reading it. */
type DeviceStorage = () => Pick<Storage, 'getItem' | 'setItem'>;

/**
 * What the device voted alone and predicted: only the device keeps it, to show the world result
 * it asks for with them, and nobody else.
 */
export interface WorldVote {
  readonly optionId: string;
  /** The share of the world it predicted voted the same, in whole percentage points. */
  readonly prediction: number;
  /** The version of the original it voted: a new version is voted again. */
  readonly version: number;
}

export interface WorldVotes {
  /** The vote of the dilemma; the same object while it does not change, as React needs. */
  readonly voteOf: (publicId: string) => WorldVote | undefined;
  readonly save: (publicId: string, vote: WorldVote) => void;
  /** Tells `onChange` every time a vote is kept; returns how to stop telling. */
  readonly subscribe: (onChange: () => void) => () => void;
}

/** The votes alone of this device. A browser that keeps nothing remembers them until the page closes. */
export function worldVotes(storage: DeviceStorage = () => localStorage): WorldVotes {
  const listeners = new Set<() => void>();
  const known = new Map<string, WorldVote | undefined>();
  return {
    voteOf: (publicId) => {
      if (!known.has(publicId)) known.set(publicId, read(storage, publicId));
      return known.get(publicId);
    },
    save: (publicId, vote) => {
      known.set(publicId, vote);
      try {
        storage().setItem(keyOf(publicId), JSON.stringify(vote));
      } catch {
        // Private mode, blocked or full storage: the vote lasts until the page closes.
      }
      listeners.forEach((notify) => notify());
    },
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

function read(storage: DeviceStorage, publicId: string): WorldVote | undefined {
  try {
    const kept: unknown = JSON.parse(storage().getItem(keyOf(publicId)) ?? 'null');
    const { optionId, prediction, version } = (kept ?? {}) as Partial<
      Record<keyof WorldVote, unknown>
    >;
    return typeof optionId === 'string' &&
      typeof prediction === 'number' &&
      typeof version === 'number'
      ? { optionId, prediction, version }
      : undefined;
  } catch {
    return undefined;
  }
}
