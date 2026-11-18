import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import { DilemmaLikedEvent } from '../../domain/events/dilemma-liked.event.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { DilemmaLikes } from '../ports/dilemma-likes.port.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import type { SealProvider } from '../ports/seal-provider.port.ts';
import { findCurrentGame } from './find-current-game.ts';

export interface LikeDilemmaInput {
  readonly roomId: string;
  readonly playerId: string;
  /** The position of the round whose dilemma the player likes in its reveal. */
  readonly position: number;
}

/**
 * A player gives «Buen dilema» to the dilemma of the reveal they are in: it counts once per
 * identity and dilemma in all, with the seal of the player at this moment. Only they learn it
 * counted. Outside that reveal it does nothing.
 */
export class LikeDilemmaUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #likes: DilemmaLikes;
  readonly #sealProvider: SealProvider;
  readonly #notifier: PlayerNotifier;
  readonly #clock: Clock;

  constructor(ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly likes: DilemmaLikes;
    readonly sealProvider: SealProvider;
    readonly notifier: PlayerNotifier;
    readonly clock: Clock;
  }) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#likes = ports.likes;
    this.#sealProvider = ports.sealProvider;
    this.#notifier = ports.notifier;
    this.#clock = ports.clock;
  }

  async execute({ roomId, playerId, position }: LikeDilemmaInput): Promise<void> {
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

    await this.#likes.like({
      identity: player.identity,
      dilemmaId: round.dilemmaId,
      seal: await this.#sealProvider.sealFor(player.identity),
      at: this.#clock.now(),
    });
    await Promise.allSettled([
      this.#notifier.notify([playerId], new DilemmaLikedEvent(game.id, playerId, game.version)),
    ]);
  }
}
