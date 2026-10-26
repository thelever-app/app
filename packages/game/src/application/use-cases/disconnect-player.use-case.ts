import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface DisconnectPlayerInput {
  readonly gameId: string;
  readonly playerId: string;
  /** The connection that closed, as ConnectPlayerUseCase returned it. */
  readonly connectionId: string;
}

/** A connection of a player closes; if it was their current one, the others see them disconnected. */
export class DisconnectPlayerUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;

  constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    notifier: PlayerNotifier,
  ) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#notifier = notifier;
  }

  async execute({ gameId, playerId, connectionId }: DisconnectPlayerInput): Promise<void> {
    const game = await this.#gameRepository.findById(gameId);
    if (!game) throw new GameNotFoundError(gameId);
    const room = await this.#roomRepository.findById(game.roomId);
    if (!room) throw new RoomNotFoundError(game.roomId);

    room.disconnect(playerId, connectionId);
    const events = room.pullEvents();
    if (events.length === 0) return;
    await this.#roomRepository.save(room);

    const otherPlayerIds = game.playerIds.filter((id) => id !== playerId);
    await Promise.allSettled(
      events.flatMap((event) => otherPlayerIds.map((id) => this.#notifier.notify(id, event))),
    );
  }
}
