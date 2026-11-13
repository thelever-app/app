import type { Room } from '../../domain/entities/room.ts';

export interface RoomRepository {
  save(room: Room): Promise<void>;
  findById(id: string): Promise<Room | undefined>;
  /** The room with that code, open or closed: no other room has it until a closed one is deleted. */
  findByCode(code: string): Promise<Room | undefined>;
  /** The rooms with no connection open, which may be closed: whether they are, each room says. */
  findIdsWithNobodyConnected(): Promise<readonly string[]>;
  /**
   * Deletes the room with its players, their connections and its lobby, unless it changed since it
   * was read, as a player who connected meanwhile would change it. Says whether it did. Its games
   * are deleted with `GameRepository.deleteOfRoom`; an adapter whose tables tie them to the room
   * may delete them here too.
   */
  delete(room: Room): Promise<boolean>;
}
