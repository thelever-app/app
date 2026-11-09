import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import { PlayerLeftEvent } from '../../domain/events/player-left.event.ts';
import { AvatarVO } from '../../domain/vos/avatar.vo.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface JoinRoomInput {
  readonly roomId: string;
  readonly nickname: string;
  /** Who joins, from their verified token. */
  readonly identity: string;
  /** The avatar the player chose before entering. */
  readonly avatar: { readonly face: string; readonly color: string };
}

export interface JoinRoomOutput {
  readonly playerId: string;
}

/**
 * A new player joins a room with the avatar they chose; whoever is already in it gets their player
 * back, and who had left the game in progress comes back to it as a player.
 */
export class JoinRoomUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #idGenerator: IdGenerator;

  constructor(ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly notifier: PlayerNotifier;
    readonly idGenerator: IdGenerator;
  }) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#notifier = ports.notifier;
    this.#idGenerator = ports.idGenerator;
  }

  async execute({ roomId, nickname, identity, avatar }: JoinRoomInput): Promise<JoinRoomOutput> {
    const room = await findRoom(this.#roomRepository, roomId);

    const chosen = new AvatarVO(avatar.face, avatar.color);
    const player = room.join({ nickname, identity, avatar: chosen }, this.#idGenerator);
    const events = room.pullEvents();
    const returned = events.some((event) => event instanceof PlayerLeftEvent && !event.left);
    const gameId = room.currentGameId;
    if (returned && gameId) {
      const game = await this.#gameRepository.findById(gameId);
      if (game?.playerIds.includes(player.id)) {
        game.rejoin(player.id);
        await this.#gameRepository.save(game);
      }
    }
    if (events.length > 0) await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);

    return { playerId: player.id };
  }
}
