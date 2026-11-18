import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { notifyGame } from './notify-game.ts';

export interface MoveOnInput {
  readonly roomId: string;
  readonly playerId: string;
  /**
   * The position of the round whose reveal the player is moving on from or, from a screen of the
   * game results, the number of rounds plus the number of that screen.
   */
  readonly fromPosition: number;
}

/**
 * Any player takes everyone from the reveal of a round to the next one, from the last one to the
 * game results, through each of their screens, and from the last to the end of the game. A host
 * still disconnected when the game ends hands the role over, so someone can start the rematch. Two
 * players who move on at once move one step: the second finds it already moved and nothing happens.
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
    if (game.stage.kind === 'ended') handOverHostIfAway(room, game);
    const gameEvents = game.pullEvents();
    const roomEvents = room.pullEvents();
    await this.#gameRepository.save(game);
    if (roomEvents.length > 0) await this.#roomRepository.save(room);

    await notifyGame({ room, game }, { roomEvents, gameEvents }, this.#notifier);
  }
}
