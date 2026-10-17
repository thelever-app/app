import type { GameRepository } from '../../application/ports/game-repository.port.ts';
import { Game, type GameSnapshot } from '../../domain/entities/game.ts';

/** Stores snapshots, not the games themselves, so changes that were not saved are lost like in a database. */
export class InMemoryGameRepository implements GameRepository {
  readonly #snapshots = new Map<string, GameSnapshot>();

  async save(game: Game): Promise<void> {
    this.#snapshots.set(game.id, game.toSnapshot());
  }

  async findById(id: string): Promise<Game | undefined> {
    const snapshot = this.#snapshots.get(id);
    return snapshot && Game.restore(snapshot);
  }
}
