import type { Clock } from '../../domain/ports/clock.port.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import { findRoom } from './find-room.ts';
import { notifyGame } from './notify-game.ts';

export interface RunOutTotalTimeInput {
  readonly roomId: string;
}

/**
 * Whoever finds the total time of the game in progress over records it: everyone learns who has
 * not finished, and an away host loses the role. It does nothing before the time is over, a
 * second time or without a game in progress, so every instance that holds players of the room may
 * run it whenever it likes.
 */
export class RunOutTotalTimeUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #clock: Clock;

  constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    notifier: PlayerNotifier,
    clock: Clock,
  ) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#notifier = notifier;
    this.#clock = clock;
  }

  async execute({ roomId }: RunOutTotalTimeInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);
    const gameId = room.currentGameId;
    if (!gameId) return;
    const game = await this.#gameRepository.findById(gameId);
    if (!game) throw new GameNotFoundError(gameId);
    if (!game.runOutTotalTime(this.#clock.now())) return;

    handOverHostIfAway(room, game);
    const gameEvents = game.pullEvents();
    const roomEvents = room.pullEvents();
    await this.#gameRepository.save(game);
    if (roomEvents.length > 0) await this.#roomRepository.save(room);

    await notifyGame({ room, game }, { roomEvents, gameEvents }, this.#notifier);
  }
}
