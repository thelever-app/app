import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
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
  readonly playerId: string;
  /** Their content, in the order every player gets them. */
  readonly dilemmas: readonly DilemmaContent[];
  readonly players: readonly {
    readonly playerId: string;
    readonly nickname: string;
    readonly progress: number;
  }[];
  /** Only the answers of the player who asks, never anybody else's. */
  readonly answers: readonly { readonly dilemmaId: string; readonly vote: string }[];
}

/** What a player may know about a game: everyone's progress and their own answers. */
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
    const answers = game.answersOf(playerId);

    // Nicknames live in the room; the game only knows who plays it.
    const players = room.players
      .filter((player) => game.playerIds.includes(player.id))
      .map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        progress: game.progressOf(player.id),
      }));

    const dilemmas = await this.#dilemmaCatalog.findContents(
      game.dilemmas.map(({ dilemmaId }) => dilemmaId),
      language,
    );

    return { gameId: game.id, playerId, dilemmas, players, answers };
  }
}
