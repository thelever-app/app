import type { Clock } from '../../domain/ports/clock.port.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import { revealIfEveryoneAnswered } from '../../domain/services/reveal-if-everyone-answered.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyGame } from './notify-game.ts';

export interface DisconnectPlayerInput {
  readonly roomId: string;
  readonly playerId: string;
  /** The connection that closed, as ConnectPlayerUseCase returned it. */
  readonly connectionId: string;
}

/**
 * A connection of a player closes; if it was the last one they had open, the others see them
 * disconnected. A host who disconnects when the game needs one loses the role.
 */
export class DisconnectPlayerUseCase {
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

  async execute({ roomId, playerId, connectionId }: DisconnectPlayerInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);

    // Saved even without an event: a connection that closes while another one stays open must not come back.
    room.disconnect(playerId, connectionId);
    const gameId = room.currentGameId;
    const game = gameId ? await this.#gameRepository.findById(gameId) : undefined;
    if (game?.playerIds.includes(playerId) && game.isInDecisionPhase) {
      // The round does not wait for who disconnects; past its time, it is revealed by time.
      if (!game.runOutRound(this.#clock.now())) revealIfEveryoneAnswered(room, game);
    }
    if (game) handOverHostIfAway(room, game);
    const roomEvents = room.pullEvents();
    const gameEvents = game?.pullEvents() ?? [];
    await this.#roomRepository.save(room);
    if (game && gameEvents.length > 0) await this.#gameRepository.save(game);

    if (game) {
      await notifyGame({ room, game }, { roomEvents, gameEvents }, this.#notifier, playerId);
      return;
    }
    const otherPlayerIds = room.players.map(({ id }) => id).filter((id) => id !== playerId);
    await Promise.allSettled(
      roomEvents.map((event) => this.#notifier.notify(otherPlayerIds, event)),
    );
  }
}
