import { GameNotEndedError } from '../../domain/errors/game-not-ended.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { notifyRoom } from './notify-room.ts';

export interface StartRematchInput {
  readonly roomId: string;
  /** The host, who launches the rematch once the game has ended. */
  readonly playerId: string;
}

/**
 * Once the game has ended, the host takes everyone still in the room to the lobby of a new game
 * with the same settings, which never plays the dilemmas the room already played.
 */
export class StartRematchUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;

  constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    notifier: PlayerNotifier,
  ) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#notifier = notifier;
  }

  async execute({ roomId, playerId }: StartRematchInput): Promise<void> {
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    if (game.stage.kind !== 'ended') throw new GameNotEndedError(game.id);

    room.startRematch(
      playerId,
      game.dilemmas.map(({ dilemmaId }) => dilemmaId),
    );
    const events = room.pullEvents();
    await this.#roomRepository.save(room);

    await notifyRoom(room, events, this.#notifier);
  }
}
