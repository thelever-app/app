import { describe, expect, it } from 'vitest';
import type { GameRepository } from '../../application/ports/game-repository.port.ts';
import type { RoomRepository } from '../../application/ports/room-repository.port.ts';
import { Game, type GameDilemma, type GameSettings } from '../../domain/entities/game.ts';
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

/** With milliseconds, so a repository that rounds times fails. */
const STARTED_AT = new Date('2026-11-09T10:00:00.123Z');
const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** Different from the defaults, so a repository that loses them fails. */
const ANONYMOUS: GameSettings = {
  variant: 'anonymous',
  groupNature: 'family',
  place: 'remote',
  dilemmaLanguage: 'ca',
  timePerDilemmaSeconds: 60,
};

/**
 * What every GameRepository must do, in memory or in PostgreSQL (ADR 0002).
 * `create` returns repositories with no rooms and no games, after storing CONTRACT_DILEMMAS
 * wherever the games can refer to them; `dilemmas` are their ids, the ids of their options and
 * whether they have the gap. Each game belongs to a room saved first, as the use cases do.
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
  async function arrange(settings: GameSettings = ANONYMOUS) {
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
    // Each origin, so a repository that loses them fails.
    const origins = ['added-by-a-player', 'picked-by-the-host', 'picked-by-the-system'] as const;
    const game = Game.create(
      {
        roomId: room.id,
        dilemmas: dilemmas.map((dilemma, index) => ({
          ...dilemma,
          origin: origins[index % 3]!,
          addedBy: index % 3 === 0 ? 'TestLuisId' : null,
        })),
        settings,
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

  /** Options in an order other than the one given, so a repository that sorts them fails. */
  function start(game: Game, room: Room): void {
    game.start(room.players, STARTED_AT, new FixedRandomness(0, 0, 1, 0, 1));
  }

  describe(`${name} (GameRepository contract)`, () => {
    describe('findById', () => {
      it('should find a saved anonymous game as it was saved', async () => {
        // Arrange
        const { games, room, game, first, second } = await arrange();
        start(game, room);
        const answeredAt = new Date(STARTED_AT.getTime() + 40 * SECOND);
        game.answer(
          'TestAnaId',
          first.dilemmaId,
          { vote: first.optionIds[0] },
          ANA_SEAL,
          answeredAt,
        );
        game.answer(
          'TestLuisId',
          first.dilemmaId,
          { vote: first.optionIds[1] },
          LUIS_SEAL,
          answeredAt,
        );
        game.runOutRound(new Date(STARTED_AT.getTime() + 10 * MINUTE));
        game.moveOn('TestLuisId', 0, new Date(STARTED_AT.getTime() + 11 * MINUTE));
        game.recordReport('TestAnaId', second.dilemmaId, true);
        game.recordReport('TestLuisId', second.dilemmaId, false);
        game.skip('TestAnaId', second.dilemmaId);
        game.leave('TestLuisId');
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.round?.movedOnBy).toBe('TestLuisId');
        expect(found?.revealOf(0).tooFewVotes).toBe(true);
      });

      it('should find a saved nominal game in the reveal, with its predictions, its points and the person in the gap', async () => {
        // Arrange
        const { games, room, game, first, second } = await arrange({
          ...ANONYMOUS,
          variant: 'nominal',
        });
        start(game, room);
        game.answer(
          'TestAnaId',
          first.dilemmaId,
          {
            vote: first.optionIds[0],
            votePredictions: [{ playerId: 'TestLuisId', vote: first.optionIds[1] }],
          },
          ANA_SEAL,
          new Date(STARTED_AT.getTime() + 12_345),
        );
        game.answer(
          'TestLuisId',
          first.dilemmaId,
          { vote: first.optionIds[1] },
          LUIS_SEAL,
          new Date(STARTED_AT.getTime() + 20 * SECOND),
        );
        game.reveal('host');
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.personInTheGap(second.dilemmaId)).not.toBeNull();
        expect(found?.pointsOf('TestAnaId')[0]).toEqual({
          dilemmaId: first.dilemmaId,
          points: 100,
        });
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
        start(game, room);

        // Assert
        const found = await games.findById('TestGameId');
        expect(found?.isInDecisionPhase).toBe(false);
      });
    });

    describe('save', () => {
      it('should keep only the last save of a game', async () => {
        // Arrange
        const { games, room, game, first } = await arrange();
        start(game, room);
        game.answer(
          'TestAnaId',
          first.dilemmaId,
          { vote: first.optionIds[0] },
          ANA_SEAL,
          STARTED_AT,
        );
        await games.save(game);
        game.answer(
          'TestAnaId',
          first.dilemmaId,
          { vote: first.optionIds[1] },
          ANA_SEAL,
          STARTED_AT,
        );
        game.answer(
          'TestLuisId',
          first.dilemmaId,
          { vote: first.optionIds[0] },
          LUIS_SEAL,
          STARTED_AT,
        );

        // Act
        await games.save(game);

        // Assert
        const found = await games.findById('TestGameId');
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.answersOf('TestAnaId').map(({ vote }) => vote)).toEqual([first.optionIds[1]]);
        expect(found?.version).toBe(4);
      });
    });
  });
}
