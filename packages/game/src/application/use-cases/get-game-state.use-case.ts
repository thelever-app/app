import type {
  DidNotVoteReason,
  DilemmaReveal,
  Game,
  GameStage,
  Round,
} from '../../domain/entities/game.ts';
import type { RankedPlayer } from '../../domain/services/rank-by-points.ts';
import type { VotePrediction } from '../../domain/vos/answer.vo.ts';
import type { PredictedShare } from '../../domain/vos/distribution-prediction.vo.ts';
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
  /** The code of the room, so the players can invite others during the game. */
  readonly code: string;
  /** The round in progress: which dilemma, its phase and when its time runs out. */
  readonly round: Omit<Round, 'dilemmaId' | 'startedAt'>;
  /** Whether the game is in its rounds, its results or its end, and who moved everyone there. */
  readonly stage: { readonly kind: GameStage; readonly movedOnBy: string | null };
  /** In an anonymous room, once the rounds are over, who reads the group best; null otherwise. */
  readonly ranking: readonly RankedPlayer[] | null;
  /** Who may reveal the dilemma of the round early now. */
  readonly hostId: string;
  /** How many have answered the dilemma of the round; all an anonymous room tells about it. */
  readonly answeredCount: number;
  /**
   * What the reveal of the dilemma of the round shows, once revealed, with what only the player who
   * asks sees of it: their distribution prediction, unless too few voted, and their points; null in
   * its decision phase.
   */
  readonly reveal:
    | (DilemmaReveal & {
        readonly yourDistributionPrediction: readonly PredictedShare[] | null;
        readonly yourPoints: number | null;
      })
    | null;
  /**
   * Their content, in the order every player gets them, with the options in the order of the player
   * who asks and who takes the gap, if it has one.
   */
  readonly dilemmas: readonly (Omit<DilemmaContent, 'language'> & {
    readonly personInTheGap: string | null;
  })[];
  /**
   * The players whose vote the player who asks predicts in the dilemma of the round: without the
   * person in the gap, who predicts everyone else; none in an anonymous room.
   */
  readonly playersToPredict: readonly string[];
  readonly players: readonly {
    readonly playerId: string;
    readonly nickname: string;
    readonly avatar: { readonly face: string; readonly color: string };
    /** Whether they answered the dilemma of the round; null in an anonymous room, which never tells who. */
    readonly answered: boolean | null;
    readonly connected: boolean;
    /** Left the game on purpose: nobody waits for them. */
    readonly left: boolean;
  }[];
  /** Only the answers of the player who asks, never anybody else's, complete or not yet. */
  readonly answers: readonly {
    readonly dilemmaId: string;
    /** Null for the dilemma the player is the person in the gap of. */
    readonly vote: string | null;
    readonly votePredictions: readonly VotePrediction[];
    /** In an anonymous room, the distribution prediction so far; null in a nominal one. */
    readonly distributionPrediction: readonly PredictedShare[] | null;
    /** In an anonymous room, whether the player pressed Ready. */
    readonly ready: boolean;
  }[];
  /** The dilemmas the player who asks reported, and whether as offensive, so they may skip it. */
  readonly reports: readonly { readonly dilemmaId: string; readonly offensive: boolean }[];
  /** The dilemmas the player who asks is recorded as "did not vote" for. */
  readonly didNotVote: readonly { readonly dilemmaId: string; readonly reason: DidNotVoteReason }[];
}

/**
 * What a player may know about a game: the round in progress and, once revealed, what its reveal
 * shows; who answered it (in an anonymous room, only how many) and who is connected; and their own
 * answers, options order and whose votes they predict. Never anyone's response time.
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
      .map(({ dilemmaId, vote, votePredictions, distributionPrediction, ready }) => ({
        dilemmaId,
        vote,
        votePredictions,
        distributionPrediction,
        ready,
      }));
    const round = game.round;
    if (!round) throw new DecisionPhaseNotStartedError();
    const anonymous = game.settings.variant === 'anonymous';

    // Nicknames live in the room; the game only knows who plays it.
    const players = room.players
      .filter((player) => game.playerIds.includes(player.id))
      .map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        avatar: { face: player.avatar.face, color: player.avatar.color },
        answered: anonymous ? null : game.hasAnswered(player.id),
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
      const options = optionOrder.map((optionId) =>
        content.options.find((option) => option.optionId === optionId)!,
      );
      return {
        dilemmaId: content.dilemmaId,
        text: content.text,
        options,
        personInTheGap: game.personInTheGap(content.dilemmaId),
      };
    });

    return {
      gameId: game.id,
      gameVersion: game.version,
      roomVersion: room.version,
      playerId,
      code: room.code,
      round: {
        position: round.position,
        phase: round.phase,
        endsAt: round.endsAt,
        revealedBy: round.revealedBy,
        movedOnBy: round.movedOnBy,
      },
      stage: game.stage,
      ranking: game.ranking(),
      hostId: room.host.id,
      answeredCount: game.answeredCount,
      reveal: round.phase === 'reveal' ? this.#revealFor(game, playerId, round.position) : null,
      dilemmas,
      playersToPredict: game.playersToPredictBy(playerId, game.dilemmas[round.position]!.dilemmaId),
      players,
      answers,
      reports: game.reportsOf(playerId),
      didNotVote: game.didNotVoteOf(playerId),
    };
  }

  #revealFor(game: Game, playerId: string, position: number): GetGameStateOutput['reveal'] {
    const reveal = game.revealOf(position);
    const answer = game.answersOf(playerId).find(({ dilemmaId }) => dilemmaId === reveal.dilemmaId);
    const scored = game.pointsOf(playerId).find(({ dilemmaId }) => dilemmaId === reveal.dilemmaId);
    return {
      ...reveal,
      yourDistributionPrediction: reveal.tooFewVotes
        ? null
        : (answer?.distributionPrediction ?? null),
      yourPoints: scored?.points ?? null,
    };
  }
}
