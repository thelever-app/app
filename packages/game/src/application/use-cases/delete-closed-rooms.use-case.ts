import type { Clock } from '../../domain/ports/clock.port.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface DeleteClosedRoomsOutput {
  /** The rooms it deleted, with their games. */
  readonly roomIds: readonly string[];
}

/**
 * Deletes every closed room with its games and everything that hangs from them: the game data of
 * every player (glossary, «Datos para jugar»). What does not hang from the room stays. A room it
 * cannot delete does not stop the others; it fails at the end, so the next run tries again.
 */
export class DeleteClosedRoomsUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #clock: Clock;

  constructor(roomRepository: RoomRepository, gameRepository: GameRepository, clock: Clock) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#clock = clock;
  }

  async execute(): Promise<DeleteClosedRoomsOutput> {
    const now = this.#clock.now();
    const roomIds: string[] = [];
    const errors: unknown[] = [];
    for (const roomId of await this.#roomRepository.findIdsWithNobodyConnected()) {
      try {
        if (await this.#deleteIfClosed(roomId, now)) roomIds.push(roomId);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} closed rooms could not be deleted`);
    }
    return { roomIds };
  }

  /**
   * The room first: if it changed since it was read, someone got in just before it closed, and it
   * stays with its games.
   */
  async #deleteIfClosed(roomId: string, now: Date): Promise<boolean> {
    const room = await this.#roomRepository.findById(roomId);
    if (!room || room.isOpenAt(now)) return false;
    if (!(await this.#roomRepository.delete(room))) return false;
    await this.#gameRepository.deleteOfRoom(roomId);
    return true;
  }
}
