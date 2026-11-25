import type { Clock } from '../../domain/ports/clock.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { Randomness } from '../../domain/ports/randomness.port.ts';
import { PlayerLeftEvent } from '../../domain/events/player-left.event.ts';
import { AvatarVO } from '../../domain/vos/avatar.vo.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import type { SealProvider } from '../ports/seal-provider.port.ts';
import { findRoom } from './find-room.ts';
import { leaveLobby } from './leave-lobby.ts';
import { notifyGame } from './notify-game.ts';
import { notifyRoom } from './notify-room.ts';
import { recordUsage } from './record-usage.ts';
import type { Usage } from '../ports/usage.port.ts';

export interface JoinRoomInput {
  readonly roomId: string;
  readonly nickname: string;
  /** Who joins, from their verified token. */
  readonly identity: string;
  /** The avatar the player chose before entering. */
  readonly avatar: { readonly face: string; readonly color: string };
  /** The dilemmas the device of the player says they played, for the room to put games together with. */
  readonly playedDilemmaIds?: readonly string[];
  /**
   * The room the player leaves for this one, as a host alone in its lobby does: once they are in,
   * they are out of it, which closes it if nobody else is there.
   */
  readonly leavingRoomId?: string;
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
 * before players could. Nobody joins a closed room, not even who was in it, and nobody under 18
 * joins a room for adults.
 */
export class JoinRoomUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #idGenerator: IdGenerator;
  readonly #randomness: Randomness;
  readonly #clock: Clock;
  readonly #sealProvider: SealProvider;
  readonly #usage: Usage;

  constructor(
    ports: {
      readonly roomRepository: RoomRepository;
      readonly gameRepository: GameRepository;
      readonly notifier: PlayerNotifier;
      readonly idGenerator: IdGenerator;
      readonly randomness: Randomness;
      readonly clock: Clock;
      /** Whether who joins is under 18, by the age they declared. */
      readonly sealProvider: SealProvider;
    },
    usage: Usage,
  ) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#notifier = ports.notifier;
    this.#idGenerator = ports.idGenerator;
    this.#randomness = ports.randomness;
    this.#clock = ports.clock;
    this.#sealProvider = ports.sealProvider;
    this.#usage = usage;
  }

  async execute({
    roomId,
    nickname,
    identity,
    avatar,
    playedDilemmaIds = [],
    leavingRoomId,
  }: JoinRoomInput): Promise<JoinRoomOutput> {
    const room = await findRoom(this.#roomRepository, roomId);

    const chosen = new AvatarVO(avatar.face, avatar.color);
    const playedBefore = room.playerWith(identity)?.playedDilemmaIds;
    const { underEighteen } = await this.#sealProvider.sealFor(identity);
    const player = room.join(
      { nickname, identity, avatar: chosen, playedDilemmaIds, underEighteen },
      this.#idGenerator,
      this.#clock.now(),
    );
    const events = room.pullEvents();
    const returned = events.some((event) => event instanceof PlayerLeftEvent && !event.left);
    const playedChanged = playedBefore?.join() !== player.playedDilemmaIds.join();
    // The room first: a player of the game must be a player of the room.
    if (events.length > 0 || playedChanged) await this.#roomRepository.save(room);
    if (playedBefore === undefined && room.host.id !== player.id) {
      await recordUsage(this.#usage, { kind: 'room-joined', identity, roomId: room.id });
    }
    const gameId = room.currentGameId;
    const game = gameId ? await this.#gameRepository.findById(gameId) : undefined;
    // Who comes once the rounds are over, in the results or at the end, watches them and waits in
    // the room for the rematch, without playing the game.
    const joinedLate =
      game !== undefined && game.stage.kind === 'rounds' && !game.playerIds.includes(player.id);
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
    if (leavingRoomId !== undefined && leavingRoomId !== room.id) {
      await this.#leave(leavingRoomId, identity);
    }

    return { playerId: player.id, joinedLate };
  }

  /**
   * Out of the lobby of the room the player leaves, if they are in it; a room that no longer
   * exists, or that started its game, stays as it is.
   */
  async #leave(roomId: string, identity: string): Promise<void> {
    const room = await this.#roomRepository.findById(roomId);
    const player = room?.playerWith(identity);
    if (!room?.isInLobby || !player) return;
    await leaveLobby(room, player.id, this.#clock.now(), {
      roomRepository: this.#roomRepository,
      notifier: this.#notifier,
    });
  }
}
