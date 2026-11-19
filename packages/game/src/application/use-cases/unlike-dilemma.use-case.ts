import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import { DilemmaUnlikedEvent } from '../../domain/events/dilemma-unliked.event.ts';
import type { DilemmaLikes } from '../ports/dilemma-likes.port.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';

export interface UnlikeDilemmaInput {
  readonly roomId: string;
  readonly playerId: string;
  /** The position of the round whose dilemma the player stops liking in its reveal. */
  readonly position: number;
}

/**
 * A player takes back «Buen dilema» from the dilemma of the reveal they are in: it stops counting
 * for its rating, as if they had never given it. Only they learn it. Once that reveal is over, the
 * like stays.
 */
export class UnlikeDilemmaUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #likes: DilemmaLikes;
  readonly #notifier: PlayerNotifier;

  constructor(ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly likes: DilemmaLikes;
    readonly notifier: PlayerNotifier;
  }) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#likes = ports.likes;
    this.#notifier = ports.notifier;
  }

  async execute({ roomId, playerId, position }: UnlikeDilemmaInput): Promise<void> {
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    const player = room.players.find(({ id }) => id === playerId);
    if (!player) throw new PlayerNotInRoomError(playerId);
    const { round } = game;
    if (game.stage.kind !== 'rounds' || round?.position !== position || round.phase !== 'reveal') {
      return;
    }

    await this.#likes.unlike(player.identity, round.dilemmaId);
    await Promise.allSettled([
      this.#notifier.notify([playerId], new DilemmaUnlikedEvent(game.id, playerId, game.version)),
    ]);
  }
}
