import { describe, expect, it } from 'vitest';
import { ambienceOf, settingsOf } from '../../vos/ambience.vo.ts';
import type { ContentRequirement, RoundSnapshot } from '../../vos/round.vo.ts';

const KEPT = { dilemmaLanguage: 'en', timePerDilemmaSeconds: 45, newDilemmas: false } as const;

const FOR_EVERYONE = {
  dilemmaId: 'TestDilemma',
  type: 'standard',
  scale: 'everyday',
  minimumAge: 16,
  hasGap: false,
  compromising: false,
} as const;

/** The rounds of an ambience, each with a single requirement or any content, as the table says. */
function roundsWith(contents: readonly ('any' | ContentRequirement)[]): RoundSnapshot[] {
  return contents.map((content, index) => ({
    id: index + 1,
    origin: 'random',
    categories: null,
    content: content === 'any' ? [] : [content],
  }));
}

describe('settingsOf', () => {
  it.each([
    {
      ambience: 'classic',
      variant: 'nominal',
      adultsOnly: false,
      compromisingDilemmas: false,
      contents: ['any', 'any', 'any', 'any', 'any', 'any', 'any', 'any'],
    },
    {
      ambience: 'spicy',
      variant: 'nominal',
      adultsOnly: true,
      compromisingDilemmas: false,
      contents: [
        'any',
        'adults-only',
        'any',
        'adults-only',
        'any',
        'adults-only',
        'any',
        'adults-only',
      ],
    },
    {
      ambience: 'no-filter',
      variant: 'anonymous',
      adultsOnly: true,
      compromisingDilemmas: true,
      contents: [
        'any',
        'compromising',
        'adults-only',
        'any',
        'compromising',
        'adults-only',
        'any',
        'compromising',
      ],
    },
  ] as const)(
    'should set up $ambience with 8 random rounds from every category',
    ({ ambience, variant, adultsOnly, compromisingDilemmas, contents }) => {
      // Act
      const settings = settingsOf(ambience, KEPT);

      // Assert
      expect(settings.toSnapshot()).toEqual({
        variant,
        adultsOnly,
        compromisingDilemmas,
        rounds: roundsWith(contents),
        ...KEPT,
      });
    },
  );
});

describe('ambienceOf', () => {
  it.each(['classic', 'spicy', 'no-filter'] as const)(
    'should tell %s by its configuration, whatever the language, the time and the new dilemmas',
    (ambience) => {
      // Arrange
      const settings = settingsOf(ambience, KEPT).with({
        dilemmaLanguage: 'fr',
        timePerDilemmaSeconds: 90,
        newDilemmas: true,
      });

      // Act & Assert
      expect(ambienceOf(settings)).toBe(ambience);
    },
  );

  it('should keep the ambience with a specific dilemma in round 1', () => {
    // Arrange
    const spicy = settingsOf('spicy', KEPT);
    const [, ...rest] = spicy.rounds;

    // Act
    const fromTheWeb = spicy.with({
      rounds: [{ id: 1, origin: 'specific', dilemma: FOR_EVERYONE }, ...rest],
    });

    // Assert
    expect(ambienceOf(fromTheWeb)).toBe('spicy');
  });

  it.each([
    {
      case: 'a round with another content',
      change: (rounds: RoundSnapshot[]) =>
        rounds.map((round) => (round.id === 2 ? { ...round, content: [] as const } : round)),
    },
    {
      case: 'a round from some categories',
      change: (rounds: RoundSnapshot[]) =>
        rounds.map((round) =>
          round.id === 3
            ? {
                id: 3,
                origin: 'random' as const,
                categories: ['honesty' as const],
                content: [] as const,
              }
            : round,
        ),
    },
    {
      case: 'a specific dilemma after round 1',
      change: (rounds: RoundSnapshot[]) =>
        rounds.map((round) =>
          round.id === 3 ? { id: 3, origin: 'specific' as const, dilemma: FOR_EVERYONE } : round,
        ),
    },
    {
      case: 'a round of the players',
      change: (rounds: RoundSnapshot[]) =>
        rounds.map((round) => (round.id === 1 ? { id: 1, origin: 'players' as const } : round)),
    },
    { case: 'one round less', change: (rounds: RoundSnapshot[]) => rounds.slice(1) },
  ])('should be custom with $case', ({ change }) => {
    // Arrange
    const spicy = settingsOf('spicy', KEPT);

    // Act
    const changed = spicy.with({ rounds: change([...spicy.rounds]) });

    // Assert
    expect(ambienceOf(changed)).toBe('custom');
  });

  it('should be custom for a variant, adults only or compromising dilemmas of no ambience', () => {
    // Act & Assert
    expect(ambienceOf(settingsOf('classic', KEPT).with({ variant: 'anonymous' }))).toBe('custom');
    expect(ambienceOf(settingsOf('classic', KEPT).with({ adultsOnly: true }))).toBe('custom');
    expect(ambienceOf(settingsOf('spicy', KEPT).with({ variant: 'anonymous' }))).toBe('custom');
  });
});
