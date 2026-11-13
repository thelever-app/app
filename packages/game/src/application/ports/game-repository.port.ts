import type { Game } from '../../domain/entities/game.ts';

export interface GameRepository {
  save(game: Game): Promise<void>;
  findById(id: string): Promise<Game | undefined>;
  /** Deletes every game the room played, with everything that hangs from it. */
  deleteOfRoom(roomId: string): Promise<void>;
}
