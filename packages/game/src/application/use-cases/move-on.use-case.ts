import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { notifyGame } from './notify-game.ts';

export interface MoveOnInput {
  readonly roomId: string;
  readonly playerId: string;
  /** The position of the round whose reveal the player is moving on from. */
  readonly fromPosition: number;
}

/**
 * Any player takes everyone from the reveal of a round to the next one. Two players who move on
 * from the same round at once move one round: the second finds it already moved and nothing happens.
 */
export class MoveOnUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #clock: Clock;

  constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    notifier: PlayerNotifier,
    clock: Clock,
  ) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#notifier = notifier;
    this.#clock = clock;
  }

  async execute({ roomId, playerId, fromPosition }: MoveOnInput): Promise<void> {
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    if (!room.hasPlayer(playerId)) throw new PlayerNotInRoomError(playerId);

    if (!game.moveOn(playerId, fromPosition, this.#clock.now())) return;
    const gameEvents = game.pullEvents();
    await this.#gameRepository.save(game);

    await notifyGame({ room, game }, { roomEvents: [], gameEvents }, this.#notifier);
  }
}
