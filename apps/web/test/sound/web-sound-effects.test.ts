import { describe, expect, it, vi } from 'vitest';
import type { Moment } from '../../src/sound/moments.ts';
import { soundPreference } from '../../src/sound/sound-preference.ts';
import { webSoundEffects, type AudioEnvironment } from '../../src/sound/web-sound-effects.ts';

const SOUNDS: Record<Moment, string> = {
  'player-joined': '/sounds/player-joined.m4a',
  'game-started': '/sounds/game-started.m4a',
  'answer-confirmed': '/sounds/answer-confirmed.m4a',
  'last-seconds': '/sounds/last-seconds.m4a',
  'dilemma-revealed': '/sounds/dilemma-revealed.m4a',
};

/** A device with Web Audio and, unless told otherwise, vibration and an audio session. */
function aDevice({ vibrate = true, audioSession = true } = {}) {
  const started: string[] = [];
  const page = new EventTarget();
  const context = {
    state: 'suspended' as AudioContextState,
    destination: {},
    resume: vi.fn(async () => {
      context.state = 'running';
    }),
    decodeAudioData: vi.fn(async (bytes: ArrayBuffer) => ({
      url: new TextDecoder().decode(bytes),
    })),
    createBufferSource: () => {
      const source = {
        buffer: undefined as { url: string } | undefined,
        connect: vi.fn(),
        start: () => started.push(source.buffer?.url ?? 'nothing'),
      };
      return source;
    },
  };
  const navigator: AudioEnvironment['navigator'] = {
    ...(vibrate && { vibrate: vi.fn(() => true) }),
    ...(audioSession && { audioSession: { type: 'auto' } }),
  };
  const environment: AudioEnvironment = {
    createAudioContext: () => context as unknown as AudioContext,
    navigator,
    page,
    fetchSound: async (url) => new TextEncoder().encode(url).buffer as ArrayBuffer,
  };
  const touch = async () => {
    page.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(() => expect(context.decodeAudioData).toHaveBeenCalledTimes(5));
  };
  return { environment, navigator, started, touch };
}

describe('webSoundEffects', () => {
  it('should mix with the audio of the device and follow its silent switch, where the browser lets it', () => {
    // Arrange
    const device = aDevice();

    // Act
    webSoundEffects(SOUNDS, soundPreference(), device.environment);

    // Assert
    expect(device.navigator.audioSession?.type).toBe('ambient');
  });

  it('should work in a browser without an audio session', () => {
    // Arrange
    const device = aDevice({ audioSession: false });

    // Act & Assert
    expect(() => webSoundEffects(SOUNDS, soundPreference(), device.environment)).not.toThrow();
  });

  it('should sound only once the player has touched the page, as browsers require', async () => {
    // Arrange
    const device = aDevice();
    const effects = webSoundEffects(SOUNDS, soundPreference(), device.environment);

    // Act
    effects.play('player-joined');
    await device.touch();
    effects.play('game-started');

    // Assert
    expect(device.started).toEqual([SOUNDS['game-started']]);
  });

  it.each(['answer-confirmed', 'dilemma-revealed'] as const)(
    'should play %s and vibrate once',
    async (moment) => {
      // Arrange
      const device = aDevice();
      const effects = webSoundEffects(SOUNDS, soundPreference(), device.environment);
      await device.touch();

      // Act
      effects.play(moment);

      // Assert
      expect(device.started).toEqual([SOUNDS[moment]]);
      expect(device.navigator.vibrate).toHaveBeenCalledTimes(1);
    },
  );

  it('should not vibrate for the moments that only sound', async () => {
    // Arrange
    const device = aDevice();
    const effects = webSoundEffects(SOUNDS, soundPreference(), device.environment);
    await device.touch();

    // Act
    effects.play('player-joined');

    // Assert
    expect(device.navigator.vibrate).not.toHaveBeenCalled();
  });

  it('should sound without vibrating where the browser cannot vibrate', async () => {
    // Arrange
    const device = aDevice({ vibrate: false });
    const effects = webSoundEffects(SOUNDS, soundPreference(), device.environment);
    await device.touch();

    // Act
    effects.play('dilemma-revealed');

    // Assert
    expect(device.started).toEqual([SOUNDS['dilemma-revealed']]);
  });

  it('should neither sound nor vibrate while the player has muted the game', async () => {
    // Arrange
    const device = aDevice();
    const preference = soundPreference(() => {
      throw new Error('nothing kept');
    });
    preference.setMuted(true);
    const effects = webSoundEffects(SOUNDS, preference, device.environment);
    await device.touch();

    // Act
    effects.play('dilemma-revealed');

    // Assert
    expect(device.started).toEqual([]);
    expect(device.navigator.vibrate).not.toHaveBeenCalled();
  });
});
