import type { Moment } from './moments.ts';

/** What the screen asks for when a moment of the game happens: its sound and, for some, a vibration. */
export interface SoundEffects {
  readonly play: (moment: Moment) => void;
}

/** For screens that must not make a sound, as in tests. */
export const SILENT: SoundEffects = { play: () => {} };
