import type { Room } from '../../domain/entities/room.ts';

export interface RoomRepository {
  save(room: Room): Promise<void>;
  findById(id: string): Promise<Room | undefined>;
}
