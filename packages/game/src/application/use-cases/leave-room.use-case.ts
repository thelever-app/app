import type { Clock } from '../../domain/ports/clock.port.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import { moveOnIfEveryoneIsReady } from '../../domain/services/move-on-if-everyone-is-ready.ts';
import { revealIfEveryoneAnswered } from '../../domain/services/reveal-if-everyone-answered.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { findRoom } from './find-room.ts';
import { notifyGame } from './notify-game.ts';
import { recordEndIfJustEnded } from './record-usage.ts';
import type { Usage } from '../ports/usage.port.ts';

export interface LeaveRoomInput {
  readonly roomId: string;
  readonly playerId: string;
}

/**
 * A player leaves on purpose. From the game in progress, nobody waits for them any more and, if
 * they were the host, the role passes on for good; they can join the room again as a player,
 * unless everyone has left: then the room closes. From the lobby, they are out of the room.
 */
export class LeaveRoomUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #clock: Clock;
  readonly #usage: Usage;

  constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    notifier: PlayerNotifier,
    clock: Clock,
    usage: Usage,
  ) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#notifier = notifier;
    this.#clock = clock;
    this.#usage = usage;
  }

  async execute({ roomId, playerId }: LeaveRoomInput): Promise<void> {
    const lobby = await findRoom(this.#roomRepository, roomId);
    if (lobby.isInLobby) {
      // From the lobby, who leaves is out of the room: their connections close, the others hear it.
      const playerIds = lobby.players.map(({ id }) => id);
      lobby.leave(playerId, [], this.#clock.now());
      const events = lobby.pullEvents();
      await this.#roomRepository.save(lobby);
      await Promise.allSettled(events.map((event) => this.#notifier.notify(playerIds, event)));
      return;
    }
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );

    const stageBefore = game.stage.kind;
    room.leave(playerId, game.playerIds, this.#clock.now());
    if (game.playerIds.includes(playerId)) {
      game.leave(playerId);
      // Neither the round nor its reveal waits for who leaves; past its time, the round is
      // revealed by time.
      if (!game.runOutRound(this.#clock.now())) {
        revealIfEveryoneAnswered(room, game, this.#clock.now());
        moveOnIfEveryoneIsReady(room, game, this.#clock.now());
      }
    }
    handOverHostIfAway(room, game);
    const roomEvents = room.pullEvents();
    const gameEvents = game.pullEvents();
    await this.#roomRepository.save(room);
    await this.#gameRepository.save(game);
    await recordEndIfJustEnded(this.#usage, room, game, stageBefore);

    // Who left hears it too: their other connections, in this or another instance, close.
    await notifyGame({ room, game }, { roomEvents, gameEvents }, this.#notifier);
  }
}
