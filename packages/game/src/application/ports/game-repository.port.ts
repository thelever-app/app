import type { Game } from '../../domain/entities/game.ts';

export interface GameRepository {
  save(game: Game): Promise<void>;
  findById(id: string): Promise<Game | undefined>;
}
