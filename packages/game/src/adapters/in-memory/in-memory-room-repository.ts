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

  async findByCode(code: string): Promise<Room | undefined> {
    const snapshot = [...this.#snapshots.values()].find(
      (candidate) => candidate.code === code.trim().toUpperCase(),
    );
    return snapshot && Room.restore(snapshot);
  }

  async findIdsWith(identity: string): Promise<readonly string[]> {
    return [...this.#snapshots.values()]
      .filter(({ players }) => players.some((player) => player.identity === identity))
      .map(({ id }) => id);
  }

  async findIdsTiedTo(identity: string): Promise<readonly string[]> {
    return [...this.#snapshots.values()]
      .filter(
        ({ players, expelledIdentities }) =>
          players.some((player) => player.identity === identity) ||
          expelledIdentities.includes(identity),
      )
      .map(({ id }) => id);
  }

  async findIdsWithNobodyConnected(): Promise<readonly string[]> {
    return [...this.#snapshots.values()]
      .filter(({ connections }) => connections.length === 0)
      .map(({ id }) => id);
  }

  async delete(room: Room): Promise<boolean> {
    if (this.#snapshots.get(room.id)?.version !== room.version) return false;
    return this.#snapshots.delete(room.id);
  }
}
