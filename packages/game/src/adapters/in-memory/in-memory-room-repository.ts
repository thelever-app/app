import type { RoomRepository } from '../../application/ports/room-repository.port.ts';
import { Room, type RoomSnapshot } from '../../domain/entities/room.ts';

/** Stores snapshots, not the rooms themselves, so changes that were not saved are lost like in a database. */
export class InMemoryRoomRepository implements RoomRepository {
  readonly #snapshots = new Map<string, RoomSnapshot>();

  async save(room: Room): Promise<void> {
    this.#snapshots.set(room.id, room.toSnapshot());
  }

  async findById(id: string): Promise<Room | undefined> {
    const snapshot = this.#snapshots.get(id);
    return snapshot && Room.restore(snapshot);
  }
}
