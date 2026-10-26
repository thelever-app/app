import { PlayerNotInGameError } from '../../domain/errors/player-not-in-game.error.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface ConnectPlayerInput {
  readonly gameId: string;
  readonly playerId: string;
}

export interface ConnectPlayerOutput {
  /** Identifies this connection, to tell its close apart from the close of an older one. */
  readonly connectionId: string;
}

/** A player opens a connection to a game, for the first time or again; the others see them connected. */
export class ConnectPlayerUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #idGenerator: IdGenerator;

  constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    notifier: PlayerNotifier,
    idGenerator: IdGenerator,
  ) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#notifier = notifier;
    this.#idGenerator = idGenerator;
  }

  async execute({ gameId, playerId }: ConnectPlayerInput): Promise<ConnectPlayerOutput> {
    const game = await this.#gameRepository.findById(gameId);
    if (!game) throw new GameNotFoundError(gameId);
    if (!game.playerIds.includes(playerId)) throw new PlayerNotInGameError(playerId);
    const room = await this.#roomRepository.findById(game.roomId);
    if (!room) throw new RoomNotFoundError(game.roomId);

    const connectionId = this.#idGenerator.generate();
    room.connect(playerId, connectionId);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);

    // The connection is already saved: a player who cannot be reached must not undo it.
    const otherPlayerIds = game.playerIds.filter((id) => id !== playerId);
    await Promise.allSettled(
      events.flatMap((event) => otherPlayerIds.map((id) => this.#notifier.notify(id, event))),
    );

    return { connectionId };
  }
}
