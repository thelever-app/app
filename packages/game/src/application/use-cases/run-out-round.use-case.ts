import type { Clock } from '../../domain/ports/clock.port.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import { findRoom } from './find-room.ts';
import { runOutRound } from './run-out-round.ts';

export interface RunOutRoundInput {
  readonly roomId: string;
}

/**
 * Whoever finds the time for the dilemma of the round over reveals it, and an away host loses the
 * role. It does nothing before the time is over, once revealed or without a game in progress, so
 * every instance that holds players of the room may run it whenever it likes.
 */
export class RunOutRoundUseCase {
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

  async execute({ roomId }: RunOutRoundInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);
    const gameId = room.currentGameId;
    if (!gameId) return;
    const game = await this.#gameRepository.findById(gameId);
    if (!game) throw new GameNotFoundError(gameId);
    await runOutRound(
      { room, game },
      {
        roomRepository: this.#roomRepository,
        gameRepository: this.#gameRepository,
        notifier: this.#notifier,
      },
      this.#clock.now(),
    );
  }
}
