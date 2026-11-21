import { describe, expect, it } from 'vitest';
import type { GameRepository } from '../../application/ports/game-repository.port.ts';
import type { RoomRepository } from '../../application/ports/room-repository.port.ts';
import { Game, type GameDilemma, type GameSettings } from '../../domain/entities/game.ts';
import { Room } from '../../domain/entities/room.ts';
import { AvatarVO } from '../../domain/vos/avatar.vo.ts';
import { FixedIdGenerator } from '../../domain/test/support/fixed-id-generator.ts';
import { FixedRandomness } from '../../domain/test/support/fixed-randomness.ts';

/** When everything in these tests happens, unless a test says otherwise. */
const NOW = new Date('2026-11-12T10:00:00Z');

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
  ambience: 'no-filter',
  variant: 'anonymous',
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
        hostUnderEighteen: false,
        ambience: 'classic',
        hostNickname: 'Ana',
        hostIdentity: 'TestAnaIdentity',
        hostAvatar: new AvatarVO('face-01', 'khaki'),
        place: 'remote',
        dilemmaLanguage: 'es',
        code: 'K7M2Q',
        createdAt: NOW,
      },
      new FixedIdGenerator('TestRoomId', 'TestAnaId'),
    );
    room.join(
      {
        underEighteen: false,
        nickname: 'Luis',
        identity: 'TestLuisIdentity',
        avatar: room.suggestAvatar(new FixedRandomness()),
      },
      new FixedIdGenerator('TestLuisId'),
      NOW,
    );
    await rooms.save(room);
    // Each origin, so a repository that loses them fails.
    const origins = ['players', 'specific', 'random'] as const;
    const game = Game.create(
      {
        roomId: room.id,
        dilemmas: dilemmas.map((dilemma, index) => ({
          ...dilemma,
          origin: origins[index % 3]!,
          chosenBy: index % 3 === 0 ? 'TestLuisId' : null,
        })),
        settings,
      },
      new FixedIdGenerator('TestGameId'),
    );
    const [first, second] = dilemmas as [GameDilemma, GameDilemma];
    return {
      games,
      rooms,
      dilemmas,
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
    describe('deleteOfRoom', () => {
      it('should delete the games of that room, answers and all, and keep those of other rooms', async () => {
        // Arrange
        const { games, rooms, dilemmas, room, game, first } = await arrange();
        start(game, room);
        game.answer(
          'TestAnaId',
          first.dilemmaId,
          { vote: first.optionIds[0] },
          ANA_SEAL,
          STARTED_AT,
        );
        await games.save(game);
        const other = Room.create(
          {
            hostUnderEighteen: false,
            ambience: 'classic',
            hostNickname: 'Eva',
            hostIdentity: 'TestEvaIdentity',
            hostAvatar: new AvatarVO('face-02', 'teal'),
            place: 'together',
            dilemmaLanguage: 'es',
            code: 'P3X8W',
            createdAt: NOW,
          },
          new FixedIdGenerator('TestOtherRoomId', 'TestEvaId'),
        );
        await rooms.save(other);
        const otherGame = Game.create(
          {
            roomId: other.id,
            dilemmas: dilemmas.map((dilemma) => ({
              ...dilemma,
              origin: 'random' as const,
              chosenBy: null,
            })),
            settings: ANONYMOUS,
          },
          new FixedIdGenerator('TestOtherGameId'),
        );
        await games.save(otherGame);

        // Act
        await games.deleteOfRoom(room.id);

        // Assert
        expect(await games.findById('TestGameId')).toBeUndefined();
        expect(await games.findById('TestOtherGameId')).toBeDefined();
      });
    });

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
          // Read in English: the answer keeps it.
          { vote: first.optionIds[1], language: 'en' },
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

      it('should find a saved anonymous game at its end, with its distribution predictions and Ready', async () => {
        // Arrange
        const { games, room, game, dilemmas, first } = await arrange();
        start(game, room);
        game.answer(
          'TestAnaId',
          first.dilemmaId,
          {
            vote: first.optionIds[0],
            distributionPrediction: [
              { optionId: first.optionIds[1], share: 35 },
              { optionId: first.optionIds[0], share: 65 },
            ],
            ready: true,
          },
          ANA_SEAL,
          new Date(STARTED_AT.getTime() + 5 * SECOND),
        );
        game.answer(
          'TestLuisId',
          first.dilemmaId,
          { vote: first.optionIds[1] },
          LUIS_SEAL,
          new Date(STARTED_AT.getTime() + 6 * SECOND),
        );
        for (const [position] of dilemmas.entries()) {
          if (game.isInDecisionPhase) game.reveal('host', STARTED_AT);
          game.moveOn('TestAnaId', position, new Date(STARTED_AT.getTime() + MINUTE));
        }
        game.moveOn('TestLuisId', dilemmas.length, new Date(STARTED_AT.getTime() + 2 * MINUTE));
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.stage).toEqual({ kind: 'ended', movedOnBy: 'TestLuisId', step: null });
        expect(found?.timeSpentOn(first.dilemmaId)).toBe(MINUTE);
        const [ana] = found?.answersOf('TestAnaId') ?? [];
        expect(ana?.distributionPrediction?.[0]).toEqual({
          optionId: first.optionIds[1],
          share: 35,
        });
        expect(ana?.ready).toBe(true);
        expect(found?.answersOf('TestLuisId')[0]?.ready).toBe(false);
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
        game.reveal('host', new Date(STARTED_AT.getTime() + 30 * SECOND));
        game.react('TestLuisId', 0, { kind: 'dilemma' }, '😮', LUIS_SEAL);
        game.react('TestAnaId', 0, { kind: 'vote', playerId: 'TestLuisId' }, '❤️', ANA_SEAL);
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.personInTheGap(second.dilemmaId)).not.toBeNull();
        expect(found?.pointsOf('TestAnaId')[0]).toEqual({
          dilemmaId: first.dilemmaId,
          points: 55,
        });
        expect(found?.round?.revealedAt).toEqual(new Date(STARTED_AT.getTime() + 30 * SECOND));
        expect(found?.reactions()).toHaveLength(2);
      });

      it('should find a saved nominal game on a screen of its results, keeping its reactions', async () => {
        // Arrange
        const { games, room, game, dilemmas, first } = await arrange({
          ...ANONYMOUS,
          variant: 'nominal',
        });
        start(game, room);
        game.answer(
          'TestAnaId',
          first.dilemmaId,
          { vote: first.optionIds[0] },
          ANA_SEAL,
          STARTED_AT,
        );
        game.reveal('host', STARTED_AT);
        game.react('TestLuisId', 0, { kind: 'vote', playerId: 'TestAnaId' }, '😂', LUIS_SEAL);
        for (const [position] of dilemmas.entries()) {
          if (game.isInDecisionPhase) game.reveal('host', STARTED_AT);
          game.moveOn('TestAnaId', position, new Date(STARTED_AT.getTime() + MINUTE));
        }
        game.moveOn('TestLuisId', dilemmas.length, STARTED_AT);
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.stage).toEqual({ kind: 'results', movedOnBy: 'TestLuisId', step: 1 });
      });

      it('should find a saved game everyone moved on by being ready, with who is ready now', async () => {
        // Arrange
        const { games, room, game, dilemmas } = await arrange();
        start(game, room);
        for (const [position] of dilemmas.entries()) {
          game.reveal('host', STARTED_AT);
          for (const playerId of game.playerIds) {
            game.getReadyToMoveOn(playerId, position, game.playerIds, STARTED_AT);
          }
        }
        game.getReadyToMoveOn('TestLuisId', dilemmas.length, game.playerIds, STARTED_AT);
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.stage).toEqual({ kind: 'results', movedOnBy: null, step: 0 });
        expect(found?.playersReadyToMoveOn).toEqual(['TestLuisId']);
      });

      it('should find a saved game with a player who joined it late', async () => {
        // Arrange
        const { games, rooms, room, game, first } = await arrange({
          ...ANONYMOUS,
          variant: 'nominal',
        });
        start(game, room);
        game.reveal('time', STARTED_AT);
        room.join(
          {
            underEighteen: false,
            nickname: 'Marta',
            identity: 'TestMartaIdentity',
            avatar: room.suggestAvatar(new FixedRandomness()),
          },
          new FixedIdGenerator('TestMartaId'),
          NOW,
        );
        await rooms.save(room);
        game.joinLate('TestMartaId', new FixedRandomness(1, 0));
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.didNotVoteOf('TestMartaId')).toEqual([
          { dilemmaId: first.dilemmaId, reason: 'joined-late' },
        ]);
        expect(found?.playersToPredictBy('TestMartaId', first.dilemmaId)).toEqual([]);
      });

      it('should find a saved game the host stopped to restart it', async () => {
        // Arrange
        const { games, room, game } = await arrange();
        start(game, room);
        game.stop('TestAnaId');
        await games.save(game);

        // Act
        const found = await games.findById('TestGameId');

        // Assert
        expect(found?.toSnapshot()).toEqual(game.toSnapshot());
        expect(found?.stage).toEqual({ kind: 'stopped', movedOnBy: 'TestAnaId', step: null });
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
