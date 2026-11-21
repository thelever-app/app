import type { Category } from '../../vos/category.vo.ts';
import { describe, expect, it } from 'vitest';
import { RoomSettingsVO } from '../../vos/room-settings.vo.ts';
import type { RoundSnapshot } from '../../vos/round.vo.ts';
import { DuplicateDilemmaError } from '../../errors/duplicate-dilemma.error.ts';
import { InvalidRoomSettingError } from '../../errors/invalid-room-setting.error.ts';

const FOR_EVERYONE = {
  dilemmaId: 'TestDilemma',
  type: 'standard',
  scale: 'everyday',
  minimumAge: 16,
  hasGap: false,
  compromising: false,
} as const;

function randomRounds(count: number): RoundSnapshot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    origin: 'random',
    categories: null,
    content: [],
  }));
}

/** A nominal room for everyone, with 8 random rounds of any content from every category. */
function settingsIn(dilemmaLanguage: string): RoomSettingsVO {
  return new RoomSettingsVO({
    variant: 'nominal',
    adultsOnly: false,
    compromisingDilemmas: false,
    dilemmaLanguage: dilemmaLanguage as never,
    rounds: randomRounds(8),
    timePerDilemmaSeconds: 60,
    newDilemmas: true,
  });
}

describe('RoomSettingsVO', () => {
  it('should throw an error for a language the app does not have', () => {
    // Act & Assert
    expect(() => settingsIn('ja')).toThrow(InvalidRoomSettingError);
  });

  describe('with', () => {
    it('should change only what is given', () => {
      // Arrange
      const settings = settingsIn('es');

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
        expect(() => settingsIn('es').with(change as never)).toThrow(InvalidRoomSettingError);
      },
    );
  });

  describe('rounds', () => {
    it('should keep each round with its origin, in order', () => {
      // Arrange
      const rounds: RoundSnapshot[] = [
        { id: 1, origin: 'specific', dilemma: FOR_EVERYONE },
        { id: 2, origin: 'random', categories: ['honesty', 'loyalty'], content: [] },
        { id: 5, origin: 'players' },
      ];

      // Act
      const settings = settingsIn('es').with({ rounds });

      // Assert
      expect(settings.rounds).toEqual(rounds);
    });

    it('should keep each category of a random round once', () => {
      // Act
      const settings = settingsIn('es').with({
        rounds: [
          {
            id: 1,
            origin: 'random',
            categories: ['honesty', 'loyalty', 'honesty'],
            content: [],
          },
        ],
      });

      // Assert
      expect(settings.rounds).toEqual([
        { id: 1, origin: 'random', categories: ['honesty', 'loyalty'], content: [] },
      ]);
    });

    it.each([0, 13])('should throw an error for %i rounds', (count) => {
      // Act & Assert
      expect(() => settingsIn('es').with({ rounds: randomRounds(count) })).toThrow(
        InvalidRoomSettingError,
      );
    });

    it.each([
      { case: 'a repeated id', round: { id: 1, origin: 'players' } },
      { case: 'an id that is not a positive whole number', round: { id: 0, origin: 'players' } },
      { case: 'an id higher than the protocol keeps', round: { id: 32_768, origin: 'players' } },
      { case: 'an unknown origin', round: { id: 2, origin: 'TestNoOrigin' } },
      {
        case: 'a category not in the closed list',
        round: {
          id: 2,
          origin: 'random',
          categories: ['TestNoCategory' as Category],
          content: [],
        },
      },
      { case: 'no categories', round: { id: 2, origin: 'random', categories: [], content: [] } },
      {
        case: 'an unknown content',
        round: { id: 2, origin: 'random', categories: null, content: 'TestNoContent' },
      },
      { case: 'a specific round without a dilemma', round: { id: 2, origin: 'specific' } },
    ])('should throw an error for $case', ({ round }) => {
      // Act & Assert
      expect(() =>
        settingsIn('es').with({
          rounds: [{ id: 1, origin: 'players' }, round as never],
        }),
      ).toThrow(InvalidRoomSettingError);
    });

    it('should throw an error for a dilemma in two specific rounds', () => {
      // Act & Assert
      expect(() =>
        settingsIn('es').with({
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
      expect(settingsIn('es').maximumMinimumAge).toBe(16);
      expect(settingsIn('es').with({ adultsOnly: true }).maximumMinimumAge).toBe(18);
    });
  });

  describe('compromisingDilemmas', () => {
    it('should be off unless the host turns them on in an anonymous room', () => {
      // Act & Assert
      expect(settingsIn('es').compromisingDilemmas).toBe(false);
      expect(
        settingsIn('es').with({ variant: 'anonymous', compromisingDilemmas: true })
          .compromisingDilemmas,
      ).toBe(true);
    });

    it('should throw an error for compromising dilemmas in a nominal room', () => {
      // Act & Assert
      expect(() => settingsIn('es').with({ compromisingDilemmas: true })).toThrow(
        InvalidRoomSettingError,
      );
    });
  });

  describe('content of a random round', () => {
    it('should keep adults-only rounds in an adults-only room and compromising ones where they are on', () => {
      // Arrange
      const rounds: RoundSnapshot[] = [
        { id: 1, origin: 'random', categories: null, content: ['adults-only'] },
        { id: 2, origin: 'random', categories: ['honesty'], content: ['compromising'] },
        {
          id: 3,
          origin: 'random',
          categories: null,
          content: ['adults-only', 'compromising'],
        },
      ];

      // Act
      const settings = settingsIn('es').with({
        variant: 'anonymous',
        adultsOnly: true,
        compromisingDilemmas: true,
        rounds,
      });

      // Assert
      expect(settings.rounds).toEqual(rounds);
    });

    it.each([
      {
        case: 'an adults-only round in a room not for adults only',
        changes: {
          rounds: [{ id: 1, origin: 'random', categories: null, content: ['adults-only'] }],
        },
      },
      {
        case: 'a compromising round with compromising dilemmas off',
        changes: {
          variant: 'anonymous',
          rounds: [{ id: 1, origin: 'random', categories: null, content: ['compromising'] }],
        },
      },
      {
        case: 'a content out of order',
        changes: {
          variant: 'anonymous',
          adultsOnly: true,
          compromisingDilemmas: true,
          rounds: [
            {
              id: 1,
              origin: 'random',
              categories: null,
              content: ['compromising', 'adults-only'],
            },
          ],
        },
      },
      {
        case: 'a requirement twice',
        changes: {
          adultsOnly: true,
          rounds: [
            { id: 1, origin: 'random', categories: null, content: ['adults-only', 'adults-only'] },
          ],
        },
      },
    ])('should throw an error for $case', ({ changes }) => {
      // Act & Assert
      expect(() => settingsIn('es').with(changes as never)).toThrow(InvalidRoomSettingError);
    });
  });
});
