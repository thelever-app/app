import type { Game } from '../../domain/entities/game.ts';

export interface GameRepository {
  save(game: Game): Promise<void>;
  findById(id: string): Promise<Game | undefined>;
  /**
   * Deletes every game the room played, with its dilemmas, its players and their answers. After
   * `RoomRepository.delete`, there may be none left to delete.
   */
  deleteOfRoom(roomId: string): Promise<void>;
}
