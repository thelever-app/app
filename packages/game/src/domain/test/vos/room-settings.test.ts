import { describe, expect, it } from 'vitest';
import { RoomSettingsVO } from '../../vos/room-settings.vo.ts';
import { InvalidRoomSettingError } from '../../errors/invalid-room-setting.error.ts';

describe('RoomSettingsVO', () => {
  describe('defaults', () => {
    it('should start nominal, for everyone, with new dilemmas and without players adding any', () => {
      // Act
      const settings = RoomSettingsVO.defaults('en');

      // Assert
      expect(settings.toSnapshot()).toEqual({
        variant: 'nominal',
        adultsOnly: false,
        dilemmaLanguage: 'en',
        category: 'life-and-death',
        dilemmaCount: 8,
        totalTimeInMinutes: 6,
        newDilemmas: true,
        playersCanAddDilemmas: false,
      });
    });

    it('should throw an error for a language the app does not have', () => {
      // Act & Assert
      expect(() => RoomSettingsVO.defaults('ja')).toThrow(InvalidRoomSettingError);
    });
  });

  describe('with', () => {
    it('should change only what is given', () => {
      // Arrange
      const settings = RoomSettingsVO.defaults('es');

      // Act
      const changed = settings.with({ variant: 'anonymous', dilemmaCount: 12 });

      // Assert
      expect(changed.variant).toBe('anonymous');
      expect(changed.dilemmaCount).toBe(12);
      expect(changed.dilemmaLanguage).toBe('es');
      expect(settings.variant).toBe('nominal');
    });

    it.each([
      { variant: 'secret' },
      { category: '  ' },
      { dilemmaCount: 7 },
      { totalTimeInMinutes: 5 },
      { dilemmaLanguage: 'ja' },
    ])('should throw an error for %o', (change) => {
      // Act & Assert
      expect(() => RoomSettingsVO.defaults('es').with(change as never)).toThrow(
        InvalidRoomSettingError,
      );
    });
  });

  describe('maximumMinimumAge', () => {
    it('should allow only dilemmas suitable from 16 unless the room is for adults only', () => {
      // Act & Assert
      expect(RoomSettingsVO.defaults('es').maximumMinimumAge).toBe(16);
      expect(RoomSettingsVO.defaults('es').with({ adultsOnly: true }).maximumMinimumAge).toBe(18);
    });
  });
});
