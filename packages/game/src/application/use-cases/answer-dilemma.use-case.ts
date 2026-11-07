import { DecisionPhaseNotStartedError } from '../../domain/errors/decision-phase-not-started.error.ts';
import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import { GameNotFoundError } from '../errors/game-not-found.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import type { SealProvider } from '../ports/seal-provider.port.ts';
import { findRoom } from './find-room.ts';

export interface AnswerDilemmaInput {
  /** The player answers the game in progress in their room. */
  readonly roomId: string;
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

  async execute({ roomId, playerId, dilemmaId, vote }: AnswerDilemmaInput): Promise<void> {
    // The identity, which the seal comes from, lives in the room; the game only knows who plays it.
    const room = await findRoom(this.#roomRepository, roomId);
    const player = room.players.find(({ id }) => id === playerId);
    if (!player) throw new PlayerNotInRoomError(playerId);
    const gameId = room.currentGameId;
    if (!gameId) throw new DecisionPhaseNotStartedError();
    const game = await this.#gameRepository.findById(gameId);
    if (!game) throw new GameNotFoundError(gameId);

    game.answer(playerId, dilemmaId, vote, await this.#sealProvider.sealFor(player.identity));
    const events = game.pullEvents();
    await this.#gameRepository.save(game);

    // The answer is already saved: a notification that fails must not undo it.
    const otherPlayerIds = game.playerIds.filter((id) => id !== playerId);
    await Promise.allSettled(events.map((event) => this.#notifier.notify(otherPlayerIds, event)));
  }
}
