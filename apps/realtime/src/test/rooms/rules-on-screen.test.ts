import { AMBIENCES, configurationOf, MINIMUM_PLAYERS } from '@thelever-app/game';
import { MINIMUM_PLAYERS as SHOWN_MINIMUM, VARIANT_OF_AMBIENCE } from '@thelever-app/protocol';
import { describe, expect, it } from 'vitest';

/** The screens show these rules without asking the room server: they must be the ones it checks. */
describe('The rules of the room the screens show', () => {
  it('should be the fewest players the domain starts a game with, by variant', () => {
    // Act & Assert
    expect(SHOWN_MINIMUM).toEqual(MINIMUM_PLAYERS);
  });

  it('should be the variant each ambience sets', () => {
    // Act & Assert
    expect(VARIANT_OF_AMBIENCE).toEqual(
      Object.fromEntries(
        AMBIENCES.map((ambience) => [ambience, configurationOf(ambience).variant]),
      ),
    );
  });
});
