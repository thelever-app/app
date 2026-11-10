import { afterEach, describe, expect, it, vi } from 'vitest';
import { soundPreference } from '../../src/sound/sound-preference.ts';

describe('soundPreference', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should sound when the player never chose', () => {
    // Act & Assert
    expect(soundPreference().isMuted()).toBe(false);
  });

  it('should remember on the device that the player muted the game', () => {
    // Arrange
    soundPreference().setMuted(true);

    // Act: the app opens again.
    const muted = soundPreference().isMuted();

    // Assert
    expect(muted).toBe(true);
  });

  it('should tell whoever listens when the player changes it', () => {
    // Arrange
    const preference = soundPreference();
    const onChange = vi.fn();
    const unsubscribe = preference.subscribe(onChange);

    // Act
    preference.setMuted(true);
    unsubscribe();
    preference.setMuted(false);

    // Assert
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('should keep the choice for this visit when the browser keeps nothing', () => {
    // Arrange
    const blocked = () => {
      throw new Error('blocked');
    };
    const preference = soundPreference(blocked);

    // Act
    preference.setMuted(true);

    // Assert
    expect(preference.isMuted()).toBe(true);
    expect(soundPreference(blocked).isMuted()).toBe(false);
  });
});
