import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';

export interface AnswerDilemmaInput {
  readonly gameId: string;
  readonly playerId: string;
  readonly dilemmaId: string;
  readonly vote: string;
}

/** A player answers a dilemma; the other players learn their new progress, never the answer. */
export class AnswerDilemmaUseCase {
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;

  constructor(gameRepository: GameRepository, notifier: PlayerNotifier) {
    this.#gameRepository = gameRepository;
    this.#notifier = notifier;
  }

  async execute({ gameId, playerId, dilemmaId, vote }: AnswerDilemmaInput): Promise<void> {
    const game = await this.#gameRepository.findById(gameId);
    if (!game) throw new GameNotFoundError(gameId);

    game.answer(playerId, dilemmaId, vote);
    const events = game.pullEvents();
    await this.#gameRepository.save(game);

    const otherPlayerIds = game.playerIds.filter((id) => id !== playerId);
    for (const event of events) {
      for (const otherPlayerId of otherPlayerIds) {
        await this.#notifier.notify(otherPlayerId, event);
      }
    }
  }
}
