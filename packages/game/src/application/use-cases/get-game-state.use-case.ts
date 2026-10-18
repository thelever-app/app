import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface GetGameStateInput {
  readonly gameId: string;
  /** The player who asks: only their answers are returned. */
  readonly playerId: string;
}

export interface GetGameStateOutput {
  readonly gameId: string;
  readonly playerId: string;
  /** In the order every player gets them. */
  readonly dilemmaIds: readonly string[];
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

  constructor(roomRepository: RoomRepository, gameRepository: GameRepository) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
  }

  async execute({ gameId, playerId }: GetGameStateInput): Promise<GetGameStateOutput> {
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

    return { gameId: game.id, playerId, dilemmaIds: game.dilemmas, players, answers };
  }
}
