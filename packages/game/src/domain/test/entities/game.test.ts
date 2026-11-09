import { describe, expect, it } from 'vitest';
import { Game } from '../../entities/game.ts';
import { Player } from '../../entities/player.ts';
import { IdMissingError } from '../../errors/id-missing.error.ts';
import { DilemmasMissingError } from '../../errors/dilemmas-missing.error.ts';
import { DecisionPhaseNotStartedError } from '../../errors/decision-phase-not-started.error.ts';
import { PlayerNotInGameError } from '../../errors/player-not-in-game.error.ts';
import { DilemmaNotInGameError } from '../../errors/dilemma-not-in-game.error.ts';
import { AnsweredCountChangedEvent } from '../../events/answered-count-changed.event.ts';
import { FixedIdGenerator } from '../support/fixed-id-generator.ts';
import { DuplicateDilemmaError } from '../../errors/duplicate-dilemma.error.ts';
import { PlayersMissingError } from '../../errors/players-missing.error.ts';
import { DecisionPhaseAlreadyStartedError } from '../../errors/decision-phase-already-started.error.ts';
import { OptionNotInDilemmaError } from '../../errors/option-not-in-dilemma.error.ts';
import { DilemmaNotInRoundError } from '../../errors/dilemma-not-in-round.error.ts';
import { OptionsMissingError } from '../../errors/options-missing.error.ts';
import { InvalidDilemmaVersionError } from '../../errors/invalid-dilemma-version.error.ts';
import { AvatarVO } from '../../vos/avatar.vo.ts';
import { KeepOrderRandomness } from '../support/keep-order-randomness.ts';

const OPTION_IDS = ['TestOption', 'TestOtherOption', 'TestSecretOption'];
const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: 'TestResearchConsentVersion',
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};
const DILEMMAS = ['TestDilemma1', 'TestDilemma2', 'TestDilemma3'].map((dilemmaId, index) => ({
  dilemmaId,
  version: index + 1,
  optionIds: OPTION_IDS,
  hasGap: false,
  origin: 'picked-by-the-system' as const,
  addedBy: null,
}));
const SETTINGS = {
  variant: 'anonymous',
  groupNature: 'friends',
  place: 'remote',
  dilemmaLanguage: 'es',
  timePerDilemmaSeconds: 60,
} as const;
const AVATAR = new AvatarVO('face-01', 'khaki');
const AT = new Date('2026-11-09T10:00:00Z');
const KEEP_ORDER = new KeepOrderRandomness();
const LATER = new Date('2026-11-09T10:00:40Z');

function gameInDecisionPhase(): { game: Game; ana: Player; luis: Player } {
  const ana = Player.create(
    { nickname: 'Ana', identity: 'TestAnaIdentity', avatar: AVATAR },
    new FixedIdGenerator('TestAnaId'),
  );
  const luis = Player.create(
    { nickname: 'Luis', identity: 'TestLuisIdentity', avatar: AVATAR },
    new FixedIdGenerator('TestLuisId'),
  );
  const game = Game.create(
    { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
    new FixedIdGenerator('TestId'),
  );
  game.start([ana, luis], AT, KEEP_ORDER);
  game.pullEvents();
  return { game, ana, luis };
}

/** The host reveals the dilemma of the round and Ana takes everyone to the next one. */
function nextRound(game: Game): void {
  const position = game.round?.position as number;
  game.reveal('host');
  game.moveOn('TestAnaId', position, AT);
}

describe('Game', () => {
  describe('create', () => {
    it('should have an id, its room id and its dilemmas, each at the version played', () => {
      // Arrange
      const id = 'TestId';
      const roomId = 'TestRoomId';

      // Act
      const game = Game.create(
        { roomId, dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator(id),
      );

      // Assert
      expect(game.id).toBe(id);
      expect(game.roomId).toBe(roomId);
      expect(game.dilemmas).toEqual(DILEMMAS);
    });

    it('should not be in the decision phase yet', () => {
      // Arrange & Act
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Assert
      expect(game.isInDecisionPhase).toBe(false);
    });

    it('should throw an error if the id is missing', () => {
      // Act & Assert
      expect(() =>
        Game.create(
          { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
          new FixedIdGenerator(''),
        ),
      ).toThrow(IdMissingError);
    });

    it('should throw an error if the room id is missing', () => {
      // Act & Assert
      expect(() =>
        Game.create(
          { roomId: '', dilemmas: DILEMMAS, settings: SETTINGS },
          new FixedIdGenerator('TestId'),
        ),
      ).toThrow(IdMissingError);
    });

    it('should throw an error if there are no dilemmas', () => {
      // Act & Assert
      expect(() =>
        Game.create(
          { roomId: 'TestRoomId', dilemmas: [], settings: SETTINGS },
          new FixedIdGenerator('TestId'),
        ),
      ).toThrow(DilemmasMissingError);
    });
  });

  describe('dilemmas', () => {
    it('should not let the dilemmas be changed from outside the game', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Act
      (game.dilemmas as unknown[]).push({
        dilemmaId: 'TestIntruderDilemma',
        version: 1,
        optionIds: OPTION_IDS,
        hasGap: false,
        origin: 'picked-by-the-host',
        addedBy: null,
      });

      // Assert
      expect(game.dilemmas).toEqual(DILEMMAS);
    });
  });

  describe('startDecisionPhase', () => {
    it('should put the game in the decision phase', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Act
      game.start(
        [
          Player.create(
            { nickname: 'Ana', identity: 'TestAnaIdentity', avatar: AVATAR },
            new FixedIdGenerator('TestAnaId'),
          ),
        ],
        AT,
        KEEP_ORDER,
      );

      // Assert
      expect(game.isInDecisionPhase).toBe(true);
    });

    it('should start every player with no progress', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );
      const ana = Player.create(
        { nickname: 'Ana', identity: 'TestAnaIdentity', avatar: AVATAR },
        new FixedIdGenerator('TestAnaId'),
      );

      // Act
      game.start([ana], AT, KEEP_ORDER);

      // Assert
      expect(game.progressOf(ana.id)).toBe(0);
    });
  });

  describe('answer', () => {
    it('should increase the progress of the player', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);
      nextRound(game);
      game.answer(luis.id, 'TestDilemma2', { vote: 'TestOption' }, SEAL, AT);
      nextRound(game);
      game.answer(luis.id, 'TestDilemma3', { vote: 'TestOption' }, SEAL, AT);

      // Assert
      expect(game.progressOf(luis.id)).toBe(3);
    });

    it('should not change the progress of the other players', () => {
      // Arrange
      const { game, ana, luis } = gameInDecisionPhase();

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Assert
      expect(game.progressOf(ana.id)).toBe(0);
    });

    it('should not increase the progress when the player changes an answer', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOtherOption' }, SEAL, AT);

      // Assert
      expect(game.progressOf(luis.id)).toBe(1);
    });

    it('should record how many have answered, in an anonymous room', () => {
      // Arrange
      const { game, ana, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Act
      game.answer(ana.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Assert
      expect(game.pullEvents()).toEqual([
        new AnsweredCountChangedEvent(game.id, 1, 2),
        new AnsweredCountChangedEvent(game.id, 2, 3),
      ]);
    });

    it('should not reveal the answer in the progress updated event', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestSecretOption' }, SEAL, AT);

      // Assert
      const [event] = game.pullEvents();
      expect(JSON.stringify(event)).not.toContain('TestSecretOption');
      expect(JSON.stringify(event)).not.toContain('TestDilemma1');
    });

    it('should not record an event when the progress does not change', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);
      game.pullEvents();

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOtherOption' }, SEAL, AT);

      // Assert
      expect(game.pullEvents()).toEqual([]);
    });

    it('should throw an error if the game is not in the decision phase', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Act & Assert
      expect(() =>
        game.answer('TestLuisId', 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT),
      ).toThrow(DecisionPhaseNotStartedError);
    });

    it('should throw an error if the player is not in the game', () => {
      // Arrange
      const { game } = gameInDecisionPhase();

      // Act & Assert
      expect(() =>
        game.answer('TestStrangerId', 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT),
      ).toThrow(PlayerNotInGameError);
    });

    it('should throw an error if the dilemma is not in the game', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act & Assert
      expect(() =>
        game.answer(luis.id, 'TestOtherDilemma', { vote: 'TestOption' }, SEAL, AT),
      ).toThrow(DilemmaNotInGameError);
    });

    it('should throw an error if the vote is not one of the options of the dilemma', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act & Assert
      expect(() =>
        game.answer(luis.id, 'TestDilemma1', { vote: 'TestUnknownOption' }, SEAL, AT),
      ).toThrow(OptionNotInDilemmaError);
      expect(game.progressOf(luis.id)).toBe(0);
    });

    it('should throw an error if the dilemma is not the one of the round', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Act & Assert
      expect(() => game.answer(luis.id, 'TestDilemma3', { vote: 'TestOption' }, SEAL, AT)).toThrow(
        DilemmaNotInRoundError,
      );
      expect(game.progressOf(luis.id)).toBe(1);
    });

    it('should keep the seal of the answer, and that the voter was not the person in the gap', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Assert
      expect(game.toSnapshot().players[1]?.answers).toMatchObject([
        { dilemmaId: 'TestDilemma1', vote: 'TestOption', seal: SEAL, voterInTheGap: false },
      ]);
    });

    it('should seal again an answer the player changes', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);
      const later = { ...SEAL, researchConsentVersion: null };

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOtherOption' }, later, AT);

      // Assert
      expect(game.toSnapshot().players[1]?.answers[0]?.seal).toEqual(later);
    });
  });

  describe('progressOf', () => {
    it('should throw an error if the player is not in the game', () => {
      // Arrange
      const { game } = gameInDecisionPhase();

      // Act & Assert
      expect(() => game.progressOf('TestStrangerId')).toThrow(PlayerNotInGameError);
    });
  });

  describe('answersOf', () => {
    it('should be empty before the player answers', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act & Assert
      expect(game.answersOf(luis.id)).toEqual([]);
    });

    it('should list only the new vote of a changed answer', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOtherOption' }, SEAL, AT);

      // Assert
      expect(game.answersOf(luis.id)).toMatchObject([
        { dilemmaId: 'TestDilemma1', vote: 'TestOtherOption' },
      ]);
    });

    it('should not include the answers of the other players', () => {
      // Arrange
      const { game, ana, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Act & Assert
      expect(game.answersOf(ana.id)).toEqual([]);
    });

    it('should throw an error if the player is not in the game', () => {
      // Arrange
      const { game } = gameInDecisionPhase();

      // Act & Assert
      expect(() => game.answersOf('TestStrangerId')).toThrow(PlayerNotInGameError);
    });
  });

  describe('version', () => {
    it('should start at 0', () => {
      // Arrange & Act
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Assert
      expect(game.version).toBe(0);
    });

    it('should go up when the decision phase starts', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Act
      game.start(
        [
          Player.create(
            { nickname: 'Ana', identity: 'TestAnaIdentity', avatar: AVATAR },
            new FixedIdGenerator('TestAnaId'),
          ),
        ],
        AT,
        KEEP_ORDER,
      );

      // Assert
      expect(game.version).toBe(1);
    });

    it('should go up with every answer, also when the player changes one', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOtherOption' }, SEAL, AT);

      // Assert
      expect(game.version).toBe(3);
    });

    it('should not go up when an answer is rejected', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act
      expect(() => game.answer(luis.id, 'TestDilemma2', { vote: 'TestOption' }, SEAL, AT)).toThrow(
        DilemmaNotInRoundError,
      );

      // Assert
      expect(game.version).toBe(1);
    });

    it('should be the version the event of the answer carries', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();

      // Act
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Assert
      const [event] = game.pullEvents();
      expect(event).toBeInstanceOf(AnsweredCountChangedEvent);
      expect((event as AnsweredCountChangedEvent).gameVersion).toBe(game.version);
    });

    it('should be kept when the game is restored', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.version).toBe(2);
    });
  });

  describe('pullEvents', () => {
    it('should empty the recorded events', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Act
      game.pullEvents();

      // Assert
      expect(game.pullEvents()).toEqual([]);
    });
  });

  describe('playerIds', () => {
    it('should be empty before the decision phase', () => {
      // Arrange & Act
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Assert
      expect(game.playerIds).toEqual([]);
    });

    it('should list the players of the decision phase', () => {
      // Arrange & Act
      const { game, ana, luis } = gameInDecisionPhase();

      // Assert
      expect(game.playerIds).toEqual([ana.id, luis.id]);
    });
  });

  describe('toSnapshot', () => {
    it('should return its state as plain data', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, LATER);

      // Act
      const snapshot = game.toSnapshot();

      // Assert
      const optionOrders = DILEMMAS.map(({ dilemmaId }) => ({
        dilemmaId,
        optionOrder: OPTION_IDS,
      }));
      const predictionSubsets = DILEMMAS.map(({ dilemmaId }) => ({
        dilemmaId,
        predictionSubset: [],
      }));
      expect(snapshot).toEqual({
        id: 'TestId',
        roomId: 'TestRoomId',
        dilemmas: DILEMMAS,
        settings: SETTINGS,
        version: 2,
        round: {
          position: 0,
          phase: 'decision',
          startedAt: AT,
          endsAt: new Date('2026-11-09T10:01:00Z'),
          revealedBy: null,
          movedOnBy: null,
        },
        peopleInTheGap: [],
        players: [
          {
            id: 'TestAnaId',
            left: false,
            optionOrders,
            predictionSubsets,
            answers: [],
            didNotVote: [],
            points: [],
            reports: [],
          },
          {
            id: 'TestLuisId',
            left: false,
            optionOrders,
            predictionSubsets,
            answers: [
              {
                dilemmaId: 'TestDilemma1',
                vote: 'TestOption',
                matchPrediction: null,
                votePredictions: [],
                optionOrder: OPTION_IDS,
                responseTimeMs: 40_000,
                seal: SEAL,
                voterInTheGap: false,
              },
            ],
            didNotVote: [],
            points: [],
            reports: [],
          },
        ],
      });
    });
  });

  describe('restore', () => {
    it('should rebuild the game from its snapshot', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);
      nextRound(game);
      game.answer(luis.id, 'TestDilemma2', { vote: 'TestOption' }, SEAL, AT);

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.toSnapshot()).toEqual(game.toSnapshot());
      expect(restored.progressOf(luis.id)).toBe(2);
    });

    it('should rebuild a game that is not in the decision phase yet', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.isInDecisionPhase).toBe(false);
      expect(restored.playerIds).toEqual([]);
    });

    it('should not record any event', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Act
      const restored = Game.restore(game.toSnapshot());

      // Assert
      expect(restored.pullEvents()).toEqual([]);
    });

    it('should go on from the restored progress', () => {
      // Arrange
      const { game, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);
      const restored = Game.restore(game.toSnapshot());

      // Act
      restored.answer('TestAnaId', 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Assert
      expect(restored.pullEvents()).toEqual([new AnsweredCountChangedEvent('TestId', 2, 3)]);
    });
  });

  describe('invariants', () => {
    it('should throw an error if a dilemma has no options', () => {
      // Act & Assert
      expect(() =>
        Game.create(
          {
            roomId: 'TestRoomId',
            dilemmas: [
              {
                dilemmaId: 'TestDilemma1',
                version: 1,
                optionIds: [],
                hasGap: false,
                origin: 'picked-by-the-host',
                addedBy: null,
              },
            ],
            settings: SETTINGS,
          },
          new FixedIdGenerator('TestId'),
        ),
      ).toThrow(OptionsMissingError);
    });

    it('should throw an error if the version of a dilemma is not a whole number from 1', () => {
      // Act & Assert
      for (const version of [0, 1.5]) {
        expect(() =>
          Game.create(
            {
              roomId: 'TestRoomId',
              dilemmas: [
                {
                  dilemmaId: 'TestDilemma1',
                  version,
                  optionIds: OPTION_IDS,
                  hasGap: false,
                  origin: 'picked-by-the-host',
                  addedBy: null,
                },
              ],
              settings: SETTINGS,
            },
            new FixedIdGenerator('TestId'),
          ),
        ).toThrow(InvalidDilemmaVersionError);
      }
    });

    it('should throw an error if a dilemma is repeated', () => {
      // Act & Assert
      expect(() =>
        Game.create(
          {
            roomId: 'TestRoomId',
            dilemmas: ['TestDilemma1', 'TestDilemma1', 'TestDilemma2'].map((dilemmaId) => ({
              dilemmaId,
              version: 1,
              optionIds: OPTION_IDS,
              hasGap: false,
              origin: 'picked-by-the-host' as const,
              addedBy: null,
            })),
            settings: SETTINGS,
          },
          new FixedIdGenerator('TestId'),
        ),
      ).toThrow(DuplicateDilemmaError);
    });

    it('should throw an error if the decision phase starts without players', () => {
      // Arrange
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas: DILEMMAS, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Act & Assert
      expect(() => game.start([], AT, KEEP_ORDER)).toThrow(PlayersMissingError);
      expect(game.isInDecisionPhase).toBe(false);
    });

    it('should throw an error if the decision phase starts twice, keeping the answers', () => {
      // Arrange
      const { game, ana, luis } = gameInDecisionPhase();
      game.answer(luis.id, 'TestDilemma1', { vote: 'TestOption' }, SEAL, AT);

      // Act & Assert
      expect(() => game.start([ana, luis], AT, KEEP_ORDER)).toThrow(
        DecisionPhaseAlreadyStartedError,
      );
      expect(game.progressOf(luis.id)).toBe(1);
    });
  });

  describe('settings and origins', () => {
    it('should keep the settings it copied from its room and how each dilemma got in', () => {
      // Arrange
      const dilemmas = [
        { ...DILEMMAS[0]!, origin: 'added-by-a-player' as const },
        { ...DILEMMAS[1]!, origin: 'picked-by-the-host' as const },
      ];

      // Act
      const game = Game.create(
        { roomId: 'TestRoomId', dilemmas, settings: SETTINGS },
        new FixedIdGenerator('TestId'),
      );

      // Assert
      expect(game.settings).toEqual(SETTINGS);
      expect(game.dilemmas.map(({ origin }) => origin)).toEqual([
        'added-by-a-player',
        'picked-by-the-host',
      ]);
    });
  });
});
