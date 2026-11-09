import type { Clock } from '../../domain/ports/clock.port.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import { revealIfEveryoneAnswered } from '../../domain/services/reveal-if-everyone-answered.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { runOutRound } from './run-out-round.ts';
import { notifyGame } from './notify-game.ts';

export interface SkipDilemmaInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly dilemmaId: string;
}

/**
 * A player skips the dilemma they are on, which they reported as offensive: it is recorded as
 * "did not vote" and the others learn their new progress.
 */
export class SkipDilemmaUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #clock: Clock;

  constructor(ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly notifier: PlayerNotifier;
    readonly clock: Clock;
  }) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#notifier = ports.notifier;
    this.#clock = ports.clock;
  }

  async execute({ roomId, playerId, dilemmaId }: SkipDilemmaInput): Promise<void> {
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    const at = this.#clock.now();

    // Too late: the dilemma is revealed as the timer would have done, and the command is dropped.
    if (
      await runOutRound(
        { room, game },
        {
          roomRepository: this.#roomRepository,
          gameRepository: this.#gameRepository,
          notifier: this.#notifier,
        },
        at,
      )
    ) {
      return;
    }
    game.skip(playerId, dilemmaId);
    revealIfEveryoneAnswered(room, game);
    handOverHostIfAway(room, game);
    const gameEvents = game.pullEvents();
    const roomEvents = room.pullEvents();
    await this.#gameRepository.save(game);
    if (roomEvents.length > 0) await this.#roomRepository.save(room);

    await notifyGame({ room, game }, { roomEvents, gameEvents }, this.#notifier);
  }
}
