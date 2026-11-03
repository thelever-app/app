import { PlayerNotInGameError } from '../../domain/errors/player-not-in-game.error.ts';
import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import type { SealProvider } from '../ports/seal-provider.port.ts';

export interface AnswerDilemmaInput {
  readonly gameId: string;
  readonly playerId: string;
  readonly dilemmaId: string;
  readonly vote: string;
}

/** A player answers a dilemma, sealed; the other players learn their new progress, never the answer. */
export class AnswerDilemmaUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #sealProvider: SealProvider;

  constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    notifier: PlayerNotifier,
    sealProvider: SealProvider,
  ) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#notifier = notifier;
    this.#sealProvider = sealProvider;
  }

  async execute({ gameId, playerId, dilemmaId, vote }: AnswerDilemmaInput): Promise<void> {
    const game = await this.#gameRepository.findById(gameId);
    if (!game) throw new GameNotFoundError(gameId);
    // The identity, which the seal comes from, lives in the room; the game only knows who plays it.
    const room = await this.#roomRepository.findById(game.roomId);
    if (!room) throw new RoomNotFoundError(game.roomId);
    const player = room.players.find(({ id }) => id === playerId);
    if (!player) throw new PlayerNotInGameError(playerId);

    game.answer(playerId, dilemmaId, vote, await this.#sealProvider.sealFor(player.identity));
    const events = game.pullEvents();
    await this.#gameRepository.save(game);

    // The answer is already saved: a notification that fails must not undo it.
    const otherPlayerIds = game.playerIds.filter((id) => id !== playerId);
    await Promise.allSettled(events.map((event) => this.#notifier.notify(otherPlayerIds, event)));
  }
}
