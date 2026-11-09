import { NotHostError } from '../../domain/errors/not-host.error.ts';
import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { notifyGame } from './notify-game.ts';

export interface StartRevealInput {
  readonly roomId: string;
  /** The host, who may start it at any moment. */
  readonly playerId: string;
}

/** The host ends the decision phase early: what is not answered is recorded as "did not vote". */
export class StartRevealUseCase {
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

  async execute({ roomId, playerId }: StartRevealInput): Promise<void> {
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    if (!room.hasPlayer(playerId)) throw new PlayerNotInRoomError(playerId);
    if (room.host.id !== playerId) throw new NotHostError(playerId);

    game.startReveal();
    const gameEvents = game.pullEvents();
    await this.#gameRepository.save(game);

    await notifyGame({ room, game }, { roomEvents: [], gameEvents }, this.#notifier);
  }
}
