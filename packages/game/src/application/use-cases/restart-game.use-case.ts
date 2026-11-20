import { NotHostError } from '../../domain/errors/not-host.error.ts';
import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { notifyRoom } from './notify-room.ts';

export interface RestartGameInput {
  readonly roomId: string;
  /** The host, who may restart the game at any moment of its rounds. */
  readonly playerId: string;
}

/**
 * The host restarts the game in its rounds: it stops, keeping the answers given, and everyone still
 * in the room goes to the lobby of a new game with the same settings, as in a rematch, which never
 * plays the dilemmas the group saw revealed.
 */
export class RestartGameUseCase {
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

  async execute({ roomId, playerId }: RestartGameInput): Promise<void> {
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    if (!room.hasPlayer(playerId)) throw new PlayerNotInRoomError(playerId);
    if (room.host.id !== playerId) throw new NotHostError(playerId);

    game.stop(playerId);
    room.startRematch(playerId, game.revealedDilemmaIds);
    const events = room.pullEvents();
    await this.#gameRepository.save(game);
    await this.#roomRepository.save(room);

    await notifyRoom(room, events, this.#notifier);
  }
}
