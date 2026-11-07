import { describe, expect, it } from 'vitest';
import type { GameRepository } from '../../application/ports/game-repository.port.ts';
import type { RoomRepository } from '../../application/ports/room-repository.port.ts';
import { Game, type GameDilemma } from '../../domain/entities/game.ts';
import { Room } from '../../domain/entities/room.ts';
import { FixedIdGenerator } from '../../domain/test/support/fixed-id-generator.ts';
import { FixedRandomness } from '../../domain/test/support/fixed-randomness.ts';

/** Two different seals, so a repository that mixes them up fails. */
const ANA_SEAL = {
  gameConsentVersion: 'TestGameConsentVersion2',
  researchConsentVersion: 'TestResearchConsentVersion1',
  commercialLicenceConsentVersion: 'TestCommercialLicenceConsentVersion1',
  underEighteen: false,
};
const LUIS_SEAL = {
  gameConsentVersion: 'TestGameConsentVersion1',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: true,
};

/**
 * What every GameRepository must do, in memory or in PostgreSQL (ADR 0002).
 * `create` returns repositories with no rooms and no games, after storing CONTRACT_DILEMMAS
 * wherever the games can refer to them; `dilemmas` are their ids and the ids of their options.
 * Each game belongs to a room saved first, as the use cases do.
 */
export function describeGameRepositoryContract(
  name: string,
  create: () => Promise<{
    games: GameRepository;
    rooms: RoomRepository;
    dilemmas: readonly GameDilemma[];
  }>,
): void {
  /** A saved room with Ana as host and Luis, and its game, not started yet. */
  async function arrange() {
    const { games, rooms, dilemmas } = await create();
    const room = Room.create(
      {
        hostNickname: 'Ana',
        hostIdentity: 'TestAnaIdentity',
        groupNature: 'family',
        place: 'remote',
        dilemmaLanguage: 'es',
        code: 'K7M2Q',
      },
      new FixedIdGenerator('TestRoomId', 'TestAnaId'),
      new FixedRandomness(),
    );
    room.join(
      { nickname: 'Luis', identity: 'TestLuisIdentity' },
      new FixedIdGenerator('TestLuisId'),
      new FixedRandomness(),
    );
    await rooms.save(room);
    // Each origin and different settings from the defaults, so a repository that loses them fails.
    const origins = ['added-by-a-player', 'picked-by-the-host', 'picked-by-the-system'] as const;
    const game = Game.create(
      {
        roomId: room.id,
        dilemmas: dilemmas.map((dilemma, index) => ({ ...dilemma, origin: origins[index % 3]! })),
        settings: {
          variant: 'anonymous',
          groupNature: 'family',
          place: 'remote',
          dilemmaLanguage: 'ca',
          totalTimeInMinutes: 10,
        },
      },
      new FixedIdGenerator('TestGameId'),
    );
    const [first, second] = dilemmas as [GameDilemma, GameDilemma];
    return {
      games,
      room,
      game,
      first: { dilemmaId: first.dilemmaId, optionIds: first.optionIds as [string, string] },
      second: {
        dilemmaId: second.dilemmaId,
        optionIds: second.optionIds as [string, string, string],
      },
    };
  }

  describe(`${name} (GameRepository contract)`, () => {
    describe('findById', () => {
      it('should find a saved game as it was saved', async () => {
        // Arrange
        const { games, room, game, first, second } = await arrange();
        game.startDecisionPhase(room.players);
        game.answer('TestAnaId', first.dilemmaId, first.optionIds[0], ANA_SEAL);
        game.answer('TestAnaId', second.dilemmaId, second.optionIds[2], ANA_SEAL);
        game.answer('TestLuisId', first.dilemmaId, first.optionIds[1], LUIS_SEAL);
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
      });

      it('should find a saved game that has not started', async () => {
        // Arrange
        const { games, game } = await arrange();
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
      });

      it('should return undefined if the game does not exist', async () => {
        // Arrange
        const { games } = await arrange();

        // Act
        const found = await games.findById('TestUnknownId');

        // Assert
        expect(found).toBeUndefined();
      });

      it('should not see changes that were not saved', async () => {
        // Arrange
        const { games, room, game } = await arrange();
        await games.save(game);

        // Act
        game.startDecisionPhase(room.players);

        // Assert
        const found = await games.findById('TestGameId');
        expect(found?.isInDecisionPhase).toBe(false);
      });
    });

    describe('save', () => {
      it('should keep only the last save of a game', async () => {
        // Arrange
        const { games, room, game, first } = await arrange();
        game.startDecisionPhase(room.players);
        game.answer('TestAnaId', first.dilemmaId, first.optionIds[0], ANA_SEAL);
        await games.save(game);
        game.answer('TestAnaId', first.dilemmaId, first.optionIds[1], ANA_SEAL);
        game.answer('TestLuisId', first.dilemmaId, first.optionIds[0], LUIS_SEAL);

        // Act
        await games.save(game);

        // Assert
        const found = await games.findById('TestGameId');
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.answersOf('TestAnaId')).toEqual([
          { dilemmaId: first.dilemmaId, vote: first.optionIds[1] },
        ]);
        expect(found?.version).toBe(4);
      });
    });
  });
}
