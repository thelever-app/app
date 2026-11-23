import type { Clock } from '../../domain/ports/clock.port.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import { moveOnIfEveryoneIsReady } from '../../domain/services/move-on-if-everyone-is-ready.ts';
import { revealIfEveryoneAnswered } from '../../domain/services/reveal-if-everyone-answered.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { notifyGame } from './notify-game.ts';
import { notifyRoom } from './notify-room.ts';

/** How another context deletes the game data of an identity. */
export interface EraseGameData {
  execute(identity: string): Promise<void>;
}

/**
 * Who withdrew the game consent or deleted their data keeps nothing in the rooms that are still
 * kept: they leave each one, their answers, predictions and reactions go, and so do those of the
 * others about them; for the others they stay as the generic nickname of the room, tied to nobody.
 * From a lobby they are simply out of it.
 */
export class EraseGameDataUseCase implements EraseGameData {
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

  async execute(identity: string): Promise<void> {
    for (const roomId of await this.#roomRepository.findIdsTiedTo(identity)) {
      await this.#eraseFrom(roomId, identity);
    }
  }

  async #eraseFrom(roomId: string, identity: string): Promise<void> {
    const room = await this.#roomRepository.findById(roomId);
    if (!room) return;
    const player = room.playerWith(identity);
    if (!player) {
      // Expelled: the room only keeps that it expelled the identity, and forgets it.
      room.forget(identity);
      await this.#roomRepository.save(room);
      return;
    }
    const now = this.#clock.now();
    const games = [];
    for (const gameId of await this.#gameRepository.idsOfRoom(roomId)) {
      const game = await this.#gameRepository.findById(gameId);
      if (game) games.push(game);
    }
    const current = games.find(({ id }) => id === room.currentGameId);

    if (room.isInLobby) {
      room.leave(player.id, [], now);
    } else if (!room.hasLeft(player.id)) {
      room.leave(player.id, current?.playerIds ?? [], now);
    }
    for (const game of games) game.forget(player.id);
    if (current && !room.isInLobby) {
      if (!current.runOutRound(now)) {
        revealIfEveryoneAnswered(room, current, now);
        moveOnIfEveryoneIsReady(room, current, now);
      }
      handOverHostIfAway(room, current);
    }
    room.forget(identity);

    const roomEvents = room.pullEvents();
    await this.#roomRepository.save(room);
    for (const game of games) await this.#gameRepository.save(game);
    if (current) {
      await notifyGame(
        { room, game: current },
        { roomEvents, gameEvents: current.pullEvents() },
        this.#notifier,
      );
    } else {
      await notifyRoom(room, roomEvents, this.#notifier);
    }
  }
}
