import type { Moment } from './moments.ts';
import type { SoundEffects } from './sound-effects.ts';
import type { SoundPreference } from './sound-preference.ts';

/** A brief tap of the phone, the same for every moment that vibrates. */
const VIBRATION_MS = 30;

const VIBRATES: ReadonlySet<Moment> = new Set(['answer-confirmed', 'dilemma-revealed']);

/** The gestures with which a browser lets a page start making sound. */
const UNLOCKING_GESTURES = ['pointerdown', 'keydown'] as const;

/** What the engine needs from the browser, so a test can hand it a device of its own. */
export interface AudioEnvironment {
  /** Undefined in a browser without Web Audio, which then plays nothing. */
  readonly createAudioContext: (() => AudioContext) | undefined;
  readonly navigator: {
    readonly vibrate?: (pattern: number) => boolean;
    /** Only Safari offers it: an ambient session mixes with the music and follows the silent switch. */
    readonly audioSession?: { type: string };
  };
  /** Where the first gesture of the player is heard. */
  readonly page: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  readonly fetchSound: (url: string) => Promise<ArrayBuffer>;
}

/** The environment of the page the web runs in. */
export function browserAudio(): AudioEnvironment {
  const AudioContextClass = globalThis.AudioContext as typeof AudioContext | undefined;
  return {
    createAudioContext: AudioContextClass && (() => new AudioContextClass()),
    navigator: globalThis.navigator as AudioEnvironment['navigator'],
    page: document,
    fetchSound: async (url) => (await fetch(url)).arrayBuffer(),
  };
}

/**
 * Plays the sound of each moment with Web Audio, which mixes several at once without delay, and
 * vibrates where the moment asks for it and the browser can. Browsers let a page sound only after
 * a gesture of the player, so the sounds load on the first one, and nothing sounds before. While
 * the player has muted the game, nothing sounds or vibrates.
 */
export function webSoundEffects(
  sounds: Record<Moment, string>,
  preference: SoundPreference,
  environment: AudioEnvironment,
): SoundEffects {
  if (environment.navigator.audioSession) environment.navigator.audioSession.type = 'ambient';

  let context: AudioContext | undefined;
  const buffers = new Map<Moment, AudioBuffer>();

  const unlock = () => {
    UNLOCKING_GESTURES.forEach((gesture) =>
      environment.page.removeEventListener(gesture, unlock, true),
    );
    context = environment.createAudioContext?.();
    if (!context) return;
    void context.resume();
    for (const [moment, url] of Object.entries(sounds) as [Moment, string][]) {
      void load(context, url).then((buffer) => buffers.set(moment, buffer));
    }
  };
  UNLOCKING_GESTURES.forEach((gesture) => environment.page.addEventListener(gesture, unlock, true));

  const load = async (audio: AudioContext, url: string) =>
    audio.decodeAudioData(await environment.fetchSound(url));

  return {
    play: (moment) => {
      if (preference.isMuted()) return;
      if (VIBRATES.has(moment)) environment.navigator.vibrate?.(VIBRATION_MS);
      const buffer = buffers.get(moment);
      if (!context || context.state !== 'running' || !buffer) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
    },
  };
}
