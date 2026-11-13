import type { Room } from '../../domain/entities/room.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export async function findRoom(roomRepository: RoomRepository, roomId: string): Promise<Room> {
  const room = await roomRepository.findById(roomId);
  if (!room) throw new RoomNotFoundError(roomId);
  return room;
}

/** A closed room lets nobody in: for whoever tries, it is a room that does not exist. */
export async function findOpenRoom(
  roomRepository: RoomRepository,
  roomId: string,
  now: Date,
): Promise<Room> {
  const room = await findRoom(roomRepository, roomId);
  if (!room.isOpenAt(now)) throw new RoomNotFoundError(roomId);
  return room;
}
