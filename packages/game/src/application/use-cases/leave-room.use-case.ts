import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import { revealIfEveryoneAnswered } from '../../domain/services/reveal-if-everyone-answered.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { notifyGame } from './notify-game.ts';

export interface LeaveRoomInput {
  readonly roomId: string;
  readonly playerId: string;
}

/**
 * A player leaves the game in progress on purpose: nobody waits for them any more and, if they
 * were the host, the role passes on for good. They can join the room again as a player.
 */
export class LeaveRoomUseCase {
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

  async execute({ roomId, playerId }: LeaveRoomInput): Promise<void> {
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );

    room.leave(playerId);
    if (game.playerIds.includes(playerId)) {
      game.leave(playerId);
      // The round does not wait for who leaves.
      revealIfEveryoneAnswered(room, game);
    }
    handOverHostIfAway(room, game);
    const roomEvents = room.pullEvents();
    const gameEvents = game.pullEvents();
    await this.#roomRepository.save(room);
    await this.#gameRepository.save(game);

    // Who left hears it too: their other connections, in this or another instance, close.
    await notifyGame({ room, game }, { roomEvents, gameEvents }, this.#notifier);
  }
}
