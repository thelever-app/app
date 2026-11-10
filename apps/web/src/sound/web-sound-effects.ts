import type { Moment } from './moments.ts';
import type { SoundEffects } from './sound-effects.ts';
import type { SoundPreference } from './sound-preference.ts';

/** A brief tap of the phone, the same for every moment that vibrates. */
const VIBRATION_MS = 30;

const VIBRATES: ReadonlySet<Moment> = new Set(['answer-confirmed', 'dilemma-revealed']);

/**
 * The gestures with which a browser lets a page start making sound. A touch counts when it ends,
 * not when it starts, so a phone needs `touchend` or `pointerup`, never `pointerdown`.
 */
const UNLOCKING_GESTURES = ['pointerup', 'touchend', 'click', 'keydown'] as const;

/** What the engine needs from the browser, so a test can hand it a device of its own. */
export interface AudioEnvironment {
  /** Undefined in a browser without Web Audio, which then plays nothing. */
  readonly createAudioContext: (() => AudioContext) | undefined;
  readonly navigator: {
    readonly vibrate?: (pattern: number) => boolean;
    /** Only Safari offers it: an ambient session mixes with the music and follows the silent switch. */
    readonly audioSession?: { type: string };
  };
  /** Where the gestures of the player are heard, and the page coming back into view. */
  readonly page: Pick<EventTarget, 'addEventListener'>;
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
 * a gesture of the player, and may stop it again (a call, the page in the background): every
 * gesture, and the page coming back into view, starts it again if it is not running. While the
 * player has muted the game, nothing sounds or vibrates; a sound that cannot be loaded stays silent.
 */
export function webSoundEffects(
  sounds: Record<Moment, string>,
  preference: SoundPreference,
  environment: AudioEnvironment,
): SoundEffects {
  if (environment.navigator.audioSession) environment.navigator.audioSession.type = 'ambient';

  let context: AudioContext | undefined;
  const buffers = new Map<Moment, AudioBuffer>();

  const load = async (audio: AudioContext, moment: Moment, url: string) => {
    try {
      buffers.set(moment, await audio.decodeAudioData(await environment.fetchSound(url)));
    } catch {
      // Not downloaded or not decoded: that moment stays silent, the others still sound.
    }
  };

  const wake = () => {
    if (!context) {
      context = environment.createAudioContext?.();
      if (!context) return;
      for (const [moment, url] of Object.entries(sounds) as [Moment, string][]) {
        void load(context, moment, url);
      }
    }
    if (context.state !== 'running') context.resume().catch(() => {});
  };
  UNLOCKING_GESTURES.forEach((gesture) => environment.page.addEventListener(gesture, wake, true));
  environment.page.addEventListener('visibilitychange', wake);

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
