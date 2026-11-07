import type { Room } from '../../domain/entities/room.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export async function findRoom(roomRepository: RoomRepository, roomId: string): Promise<Room> {
  const room = await roomRepository.findById(roomId);
  if (!room) throw new RoomNotFoundError(roomId);
  return room;
}
