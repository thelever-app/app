import { describe, expect, it } from 'vitest';
import { AnswerDilemmaUseCase } from '../../use-cases/answer-dilemma.use-case.ts';
import { GetGameStateUseCase } from '../../use-cases/get-game-state.use-case.ts';
import { MoveOnUseCase } from '../../use-cases/move-on.use-case.ts';
import { RevealEarlyUseCase } from '../../use-cases/reveal-early.use-case.ts';
import { GameStageChangedEvent } from '../../../domain/events/game-stage-changed.event.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { InMemoryDilemmaLikes } from '../../../adapters/in-memory/in-memory-dilemma-likes.ts';
import { InMemorySealProvider } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { gameInDecisionPhase } from '../support/game-in-decision-phase.ts';

/** Ana hosts Luis and Marta in an anonymous game, in its first round. */
async function arrange() {
  const notifier = new InMemoryPlayerNotifier();
  const game = await gameInDecisionPhase(notifier);
  const answerDilemma = new AnswerDilemmaUseCase({
    dilemmaCatalog: game.catalog,
    roomRepository: game.roomRepository,
    gameRepository: game.gameRepository,
    notifier,
    sealProvider: new InMemorySealProvider(),
    clock: game.clock,
  });
  const revealEarly = new RevealEarlyUseCase(
    game.roomRepository,
    game.gameRepository,
    notifier,
    game.clock,
  );
  const moveOn = new MoveOnUseCase(game.roomRepository, game.gameRepository, notifier, game.clock);
  const getGameState = new GetGameStateUseCase(
    game.roomRepository,
    game.gameRepository,
    game.catalog,
    new InMemoryDilemmaLikes(),
  );
  const stateOf = (playerId: string) =>
    getGameState.execute({ gameId: game.gameId, playerId, language: 'es' });
  const everyone = [game.anaId, game.luisId, game.martaId];

  /** Each player votes the first option of the round and predicts all of it, with Ready; Ana reveals it. */
  async function playRound(predictions: Record<string, number> = {}) {
    const state = await stateOf(game.anaId);
    const { dilemmaId, options } = state.dilemmas[state.round.position]!;
    const [first, ...rest] = options.map(({ optionId }) => optionId);
    for (const playerId of everyone) {
      const share = predictions[playerId] ?? 100;
      await answerDilemma.execute({
        language: 'es',
        roomId: game.roomId,
        playerId,
        dilemmaId,
        vote: first!,
        distributionPrediction: [
          { optionId: first!, share },
          ...rest.map((optionId, index) => ({
            optionId,
            share: index === 0 ? 100 - share : 0,
          })),
        ],
        ready: true,
      });
    }
    await revealEarly.execute({ roomId: game.roomId, playerId: game.anaId });
  }

  /** Plays every round, the first one with those predictions, and moves on to the game results. */
  async function toTheResults(predictions: Record<string, number> = {}) {
    for (const [position] of game.dilemmaIds.entries()) {
      await playRound(position === 0 ? predictions : {});
      await moveOn.execute({ roomId: game.roomId, playerId: game.luisId, fromPosition: position });
    }
  }

  return { ...game, notifier, answerDilemma, moveOn, stateOf, playRound, toTheResults };
}

describe('The distribution prediction, in an anonymous room', () => {
  it('should show each player only their own prediction and points in the reveal', async () => {
    // Arrange
    const { anaId, luisId, stateOf, playRound } = await arrange();

    // Act
    await playRound({ [luisId]: 60 });

    // Assert
    const luis = await stateOf(luisId);
    const ana = await stateOf(anaId);
    expect(luis.reveal?.yourDistributionPrediction?.[0]?.share).toBe(60);
    expect(luis.reveal?.yourPoints).toBe(60);
    expect(ana.reveal?.yourDistributionPrediction?.[0]?.share).toBe(100);
    expect(ana.reveal?.yourPoints).toBe(100);
    expect(JSON.stringify(ana)).not.toContain('"share":60');
  });

  it('should keep the totals hidden until the game results', async () => {
    // Arrange
    const { anaId, stateOf, playRound } = await arrange();

    // Act
    await playRound();

    // Assert
    const state = await stateOf(anaId);
    expect(state.stage).toEqual({ kind: 'rounds', movedOnBy: null, step: null });
    expect(state.ranking).toBeNull();
  });

  it('should take everyone from the last round to the ranking of who reads the group best', async () => {
    // Arrange
    const { anaId, luisId, martaId, gameId, notifier, stateOf, toTheResults } = await arrange();

    // Act
    await toTheResults({ [luisId]: 60, [martaId]: 60 });

    // Assert
    const state = await stateOf(martaId);
    const rounds = state.dilemmas.length;
    expect(state.stage).toEqual({ kind: 'results', movedOnBy: luisId, step: 0 });
    expect(state.ranking).toEqual([
      { playerId: anaId, points: 100 * rounds, position: 1, mentalist: true },
      { playerId: luisId, points: 100 * rounds - 40, position: 2, mentalist: false },
      { playerId: martaId, points: 100 * rounds - 40, position: 2, mentalist: false },
    ]);
    expect(notifier.receivedBy(anaId).at(-1)).toEqual(
      new GameStageChangedEvent(gameId, 'results', luisId, state.gameVersion),
    );
  });

  it('should end the game when a player moves on from the ranking', async () => {
    // Arrange
    const { roomId, martaId, gameId, notifier, moveOn, stateOf, toTheResults } = await arrange();
    await toTheResults();
    const rounds = (await stateOf(martaId)).dilemmas.length;

    // Act
    await moveOn.execute({ roomId, playerId: martaId, fromPosition: rounds });
    await moveOn.execute({ roomId, playerId: martaId, fromPosition: rounds });

    // Assert
    const state = await stateOf(martaId);
    expect(state.stage).toEqual({ kind: 'ended', movedOnBy: martaId, step: null });
    expect(state.ranking).not.toBeNull();
    const stages = notifier
      .receivedBy(martaId)
      .filter((event) => event instanceof GameStageChangedEvent);
    expect(stages.map(({ stage }) => stage)).toEqual(['results', 'ended']);
    expect(stages.at(-1)).toEqual(
      new GameStageChangedEvent(gameId, 'ended', martaId, state.gameVersion),
    );
  });
});
