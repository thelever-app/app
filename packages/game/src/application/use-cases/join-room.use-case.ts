import type { Clock } from '../../domain/ports/clock.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { Randomness } from '../../domain/ports/randomness.port.ts';
import { PlayerLeftEvent } from '../../domain/events/player-left.event.ts';
import { AvatarVO } from '../../domain/vos/avatar.vo.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyGame } from './notify-game.ts';
import { notifyRoom } from './notify-room.ts';

export interface JoinRoomInput {
  readonly roomId: string;
  readonly nickname: string;
  /** Who joins, from their verified token. */
  readonly identity: string;
  /** The avatar the player chose before entering. */
  readonly avatar: { readonly face: string; readonly color: string };
  /** The dilemmas the device of the player says they played, for the room to put games together with. */
  readonly playedDilemmaIds?: readonly string[];
}

export interface JoinRoomOutput {
  readonly playerId: string;
  /** Whether joining took the player into a game in progress they were not in. */
  readonly joinedLate: boolean;
}

/**
 * A new player joins a room with the avatar they chose; whoever is already in it gets their player
 * back, and who had left the game in progress comes back to it as a player. With a game in
 * progress, a player of the room who is not in it joins it late, also one who joined the room
 * before players could. Nobody joins a closed room, not even who was in it.
 */
export class JoinRoomUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #idGenerator: IdGenerator;
  readonly #randomness: Randomness;
  readonly #clock: Clock;

  constructor(ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly notifier: PlayerNotifier;
    readonly idGenerator: IdGenerator;
    readonly randomness: Randomness;
    readonly clock: Clock;
  }) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#notifier = ports.notifier;
    this.#idGenerator = ports.idGenerator;
    this.#randomness = ports.randomness;
    this.#clock = ports.clock;
  }

  async execute({
    roomId,
    nickname,
    identity,
    avatar,
    playedDilemmaIds = [],
  }: JoinRoomInput): Promise<JoinRoomOutput> {
    const room = await findRoom(this.#roomRepository, roomId);

    const chosen = new AvatarVO(avatar.face, avatar.color);
    const playedBefore = room.playerWith(identity)?.playedDilemmaIds;
    const player = room.join(
      { nickname, identity, avatar: chosen, playedDilemmaIds },
      this.#idGenerator,
      this.#clock.now(),
    );
    const events = room.pullEvents();
    const returned = events.some((event) => event instanceof PlayerLeftEvent && !event.left);
    const playedChanged = playedBefore?.join() !== player.playedDilemmaIds.join();
    // The room first: a player of the game must be a player of the room.
    if (events.length > 0 || playedChanged) await this.#roomRepository.save(room);
    const gameId = room.currentGameId;
    const game = gameId ? await this.#gameRepository.findById(gameId) : undefined;
    // Who comes once the game has ended waits in the room for the rematch, without playing it.
    const joinedLate =
      game !== undefined && game.stage.kind !== 'ended' && !game.playerIds.includes(player.id);
    if (game && joinedLate) {
      game.joinLate(player.id, this.#randomness);
      await this.#gameRepository.save(game);
    } else if (game && returned) {
      game.rejoin(player.id);
      await this.#gameRepository.save(game);
    }
    if (game) {
      const gameEvents = game.pullEvents();
      await notifyGame({ room, game }, { roomEvents: events, gameEvents }, this.#notifier);
    } else {
      await notifyRoom(room, events, this.#notifier);
    }

    return { playerId: player.id, joinedLate };
  }
}
