import type { DidNotVoteReason, GamePhase } from '../../domain/entities/game.ts';
import type { VotePrediction } from '../../domain/vos/answer.vo.ts';
import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import { DecisionPhaseNotStartedError } from '../../domain/errors/decision-phase-not-started.error.ts';
import type { DilemmaCatalog, DilemmaContent } from '../ports/dilemma-catalog.port.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface GetGameStateInput {
  readonly gameId: string;
  /** The player who asks: only their answers are returned. */
  readonly playerId: string;
  /** The language the player reads the dilemmas in. */
  readonly language: string;
}

export interface GetGameStateOutput {
  readonly gameId: string;
  /** The version of the game this state was computed from. */
  readonly gameVersion: number;
  /** The version of the connections of the room this state was computed from. */
  readonly roomVersion: number;
  readonly playerId: string;
  readonly phase: GamePhase;
  /** Who may start the reveal now. */
  readonly hostId: string;
  /** When the total time runs out; the game goes on after it. */
  readonly totalTimeEndsAt: Date;
  readonly totalTimeRanOut: boolean;
  /**
   * Their content, in the order every player gets them, with the options in the order of the player
   * who asks, the players whose vote they predict and who takes the gap, if it has one.
   */
  readonly dilemmas: readonly (DilemmaContent & {
    readonly predictionSubset: readonly string[];
    readonly personInTheGap: string | null;
  })[];
  readonly players: readonly {
    readonly playerId: string;
    readonly nickname: string;
    readonly avatar: { readonly face: string; readonly color: string };
    readonly progress: number;
    readonly connected: boolean;
    /** Left the game on purpose: nobody waits for them. */
    readonly left: boolean;
  }[];
  /** Only the answers of the player who asks, never anybody else's, complete or not yet. */
  readonly answers: readonly {
    readonly dilemmaId: string;
    readonly vote: string;
    readonly matchPrediction: number | null;
    readonly votePredictions: readonly VotePrediction[];
  }[];
  /** The dilemmas the player who asks reported, and whether as offensive, so they may skip it. */
  readonly reports: readonly { readonly dilemmaId: string; readonly offensive: boolean }[];
  /** The dilemmas the player who asks is recorded as "did not vote" for. */
  readonly didNotVote: readonly { readonly dilemmaId: string; readonly reason: DidNotVoteReason }[];
}

/**
 * What a player may know about a game: everyone's progress and connection, and their own
 * answers, options order and prediction subsets. Never anyone's response time.
 */
export class GetGameStateUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #dilemmaCatalog: DilemmaCatalog;

  constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    dilemmaCatalog: DilemmaCatalog,
  ) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#dilemmaCatalog = dilemmaCatalog;
  }

  async execute({ gameId, playerId, language }: GetGameStateInput): Promise<GetGameStateOutput> {
    const game = await this.#gameRepository.findById(gameId);
    if (!game) throw new GameNotFoundError(gameId);
    const room = await this.#roomRepository.findById(game.roomId);
    if (!room) throw new RoomNotFoundError(game.roomId);

    // Throws if the player does not play this game, before anything about it is returned.
    const answers = game
      .answersOf(playerId)
      .map(({ dilemmaId, vote, matchPrediction, votePredictions }) => ({
        dilemmaId,
        vote,
        matchPrediction,
        votePredictions,
      }));
    const phase = game.phase;
    const totalTimeEndsAt = game.totalTimeEndsAt;
    if (!phase || !totalTimeEndsAt) throw new DecisionPhaseNotStartedError();

    // Nicknames live in the room; the game only knows who plays it.
    const players = room.players
      .filter((player) => game.playerIds.includes(player.id))
      .map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        avatar: { face: player.avatar.face, color: player.avatar.color },
        progress: game.progressOf(player.id),
        connected: room.isConnected(player.id),
        left: room.hasLeft(player.id),
      }));

    // The versions the game plays, even if a dilemma got a new one since it started.
    const contents = await this.#dilemmaCatalog.findContents(
      game.dilemmas.map(({ dilemmaId, version }) => ({ dilemmaId, version })),
      language,
    );
    const dilemmas = contents.map((content) => {
      const optionOrder = game.optionOrderOf(playerId, content.dilemmaId);
      const predictionSubset = game.predictionSubsetOf(playerId, content.dilemmaId);
      const options = optionOrder.map((optionId) =>
        content.options.find((option) => option.optionId === optionId)!,
      );
      return {
        ...content,
        options,
        predictionSubset,
        personInTheGap: game.personInTheGap(content.dilemmaId),
      };
    });

    return {
      gameId: game.id,
      gameVersion: game.version,
      roomVersion: room.version,
      playerId,
      phase,
      hostId: room.host.id,
      totalTimeEndsAt,
      totalTimeRanOut: game.totalTimeRanOut,
      dilemmas,
      players,
      answers,
      reports: game.reportsOf(playerId),
      didNotVote: game.didNotVoteOf(playerId),
    };
  }
}
