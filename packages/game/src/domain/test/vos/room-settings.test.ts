import type { Category } from '../../vos/category.vo.ts';
import { describe, expect, it } from 'vitest';
import { RoomSettingsVO } from '../../vos/room-settings.vo.ts';
import type { RoundSnapshot } from '../../vos/round.vo.ts';
import { DuplicateDilemmaError } from '../../errors/duplicate-dilemma.error.ts';
import { InvalidRoomSettingError } from '../../errors/invalid-room-setting.error.ts';

const FOR_EVERYONE = { dilemmaId: 'TestDilemma', minimumAge: 16, compromising: false } as const;

function randomRounds(count: number): RoundSnapshot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    origin: 'random',
    categories: null,
  }));
}

describe('RoomSettingsVO', () => {
  describe('defaults', () => {
    it('should start nominal, for everyone, with new dilemmas and 8 random rounds from every category', () => {
      // Act
      const settings = RoomSettingsVO.defaults('en');

      // Assert
      expect(settings.toSnapshot()).toEqual({
        variant: 'nominal',
        adultsOnly: false,
        dilemmaLanguage: 'en',
        rounds: randomRounds(8),
        timePerDilemmaSeconds: 60,
        newDilemmas: true,
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
      const changed = settings.with({ variant: 'anonymous', rounds: randomRounds(12) });

      // Assert
      expect(changed.variant).toBe('anonymous');
      expect(changed.rounds).toHaveLength(12);
      expect(changed.dilemmaLanguage).toBe('es');
      expect(settings.variant).toBe('nominal');
    });

    it.each([{ variant: 'secret' }, { timePerDilemmaSeconds: 5 }, { dilemmaLanguage: 'ja' }])(
      'should throw an error for %o',
      (change) => {
        // Act & Assert
        expect(() => RoomSettingsVO.defaults('es').with(change as never)).toThrow(
          InvalidRoomSettingError,
        );
      },
    );
  });

  describe('rounds', () => {
    it('should keep each round with its origin, in order', () => {
      // Arrange
      const rounds: RoundSnapshot[] = [
        { id: 1, origin: 'specific', dilemma: FOR_EVERYONE },
        { id: 2, origin: 'random', categories: ['honesty', 'loyalty'] },
        { id: 5, origin: 'players' },
      ];

      // Act
      const settings = RoomSettingsVO.defaults('es').with({ rounds });

      // Assert
      expect(settings.rounds).toEqual(rounds);
    });

    it('should keep each category of a random round once', () => {
      // Act
      const settings = RoomSettingsVO.defaults('es').with({
        rounds: [{ id: 1, origin: 'random', categories: ['honesty', 'loyalty', 'honesty'] }],
      });

      // Assert
      expect(settings.rounds).toEqual([
        { id: 1, origin: 'random', categories: ['honesty', 'loyalty'] },
      ]);
    });

    it.each([0, 13])('should throw an error for %i rounds', (count) => {
      // Act & Assert
      expect(() => RoomSettingsVO.defaults('es').with({ rounds: randomRounds(count) })).toThrow(
        InvalidRoomSettingError,
      );
    });

    it.each([
      { case: 'a repeated id', round: { id: 1, origin: 'players' } },
      { case: 'an id that is not a positive whole number', round: { id: 0, origin: 'players' } },
      { case: 'an unknown origin', round: { id: 2, origin: 'TestNoOrigin' } },
      {
        case: 'a category not in the closed list',
        round: { id: 2, origin: 'random', categories: ['TestNoCategory' as Category] },
      },
      { case: 'no categories', round: { id: 2, origin: 'random', categories: [] } },
      { case: 'a specific round without a dilemma', round: { id: 2, origin: 'specific' } },
    ])('should throw an error for $case', ({ round }) => {
      // Act & Assert
      expect(() =>
        RoomSettingsVO.defaults('es').with({
          rounds: [{ id: 1, origin: 'players' }, round as never],
        }),
      ).toThrow(InvalidRoomSettingError);
    });

    it('should throw an error for a dilemma in two specific rounds', () => {
      // Act & Assert
      expect(() =>
        RoomSettingsVO.defaults('es').with({
          rounds: [
            { id: 1, origin: 'specific', dilemma: FOR_EVERYONE },
            { id: 2, origin: 'specific', dilemma: FOR_EVERYONE },
          ],
        }),
      ).toThrow(DuplicateDilemmaError);
    });
  });

  describe('maximumMinimumAge', () => {
    it('should allow only dilemmas suitable from 16 unless the room is for adults only', () => {
      // Act & Assert
      expect(RoomSettingsVO.defaults('es').maximumMinimumAge).toBe(16);
      expect(RoomSettingsVO.defaults('es').with({ adultsOnly: true }).maximumMinimumAge).toBe(18);
    });
  });

  describe('includesCompromisingDilemmas', () => {
    it('should leave out the compromising dilemmas, in any room', () => {
      // Act & Assert
      expect(RoomSettingsVO.defaults('es').includesCompromisingDilemmas).toBe(false);
      expect(
        RoomSettingsVO.defaults('es').with({ variant: 'anonymous', adultsOnly: true })
          .includesCompromisingDilemmas,
      ).toBe(false);
    });
  });
});
