import { NotHostError } from '../../domain/errors/not-host.error.ts';
import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { notifyGame } from './notify-game.ts';

export interface RevealEarlyInput {
  readonly roomId: string;
  /** The host, who may reveal the dilemma of the round at any moment of its decision phase. */
  readonly playerId: string;
}

/**
 * The host reveals the dilemma of the round without waiting: what is not answered is recorded as
 * "did not vote". If its time ran out meanwhile, it is already revealed and nothing else happens.
 */
export class RevealEarlyUseCase {
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

  async execute({ roomId, playerId }: RevealEarlyInput): Promise<void> {
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    if (!room.hasPlayer(playerId)) throw new PlayerNotInRoomError(playerId);
    if (room.host.id !== playerId) throw new NotHostError(playerId);

    game.runOutRound(this.#clock.now());
    if (game.isInDecisionPhase) game.reveal('host');
    const gameEvents = game.pullEvents();
    if (gameEvents.length === 0) return;
    await this.#gameRepository.save(game);

    await notifyGame({ room, game }, { roomEvents: [], gameEvents }, this.#notifier);
  }
}
