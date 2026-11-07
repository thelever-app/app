import type { Room } from '../../domain/entities/room.ts';

export interface RoomRepository {
  save(room: Room): Promise<void>;
  findById(id: string): Promise<Room | undefined>;
  /** The open room with that code, which no other open room has. */
  findByCode(code: string): Promise<Room | undefined>;
}
