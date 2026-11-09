import type { VotePrediction } from '../../domain/vos/answer.vo.ts';
import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import { revealIfEveryoneAnswered } from '../../domain/services/reveal-if-everyone-answered.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import type { SealProvider } from '../ports/seal-provider.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { runOutRoundFirst } from './run-out-round-first.ts';
import { notifyGame } from './notify-game.ts';

export interface AnswerDilemmaInput {
  /** The player answers the game in progress in their room. */
  readonly roomId: string;
  readonly playerId: string;
  readonly dilemmaId: string;
  readonly vote: string;
  /** In a nominal room, the predictions made so far; the client sends them with every change. */
  readonly matchPrediction?: number | null;
  readonly votePredictions?: readonly VotePrediction[];
}

/**
 * A player answers a dilemma, sealed, complete or not yet; the other players learn their new
 * progress, never the answer. The game may move to the reveal, and an away host may lose the role.
 */
export class AnswerDilemmaUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #notifier: PlayerNotifier;
  readonly #sealProvider: SealProvider;
  readonly #clock: Clock;

  constructor(ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly notifier: PlayerNotifier;
    readonly sealProvider: SealProvider;
    readonly clock: Clock;
  }) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#notifier = ports.notifier;
    this.#sealProvider = ports.sealProvider;
    this.#clock = ports.clock;
  }

  async execute({ roomId, playerId, dilemmaId, ...draft }: AnswerDilemmaInput): Promise<void> {
    // The identity, which the seal comes from, lives in the room; the game only knows who plays it.
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    const player = room.players.find(({ id }) => id === playerId);
    if (!player) throw new PlayerNotInRoomError(playerId);
    const at = this.#clock.now();

    await runOutRoundFirst(
      { room, game },
      {
        roomRepository: this.#roomRepository,
        gameRepository: this.#gameRepository,
        notifier: this.#notifier,
      },
      at,
    );
    game.answer(playerId, dilemmaId, draft, await this.#sealProvider.sealFor(player.identity), at);
    revealIfEveryoneAnswered(room, game);
    handOverHostIfAway(room, game);
    const gameEvents = game.pullEvents();
    const roomEvents = room.pullEvents();
    await this.#gameRepository.save(game);
    if (roomEvents.length > 0) await this.#roomRepository.save(room);

    await notifyGame({ room, game }, { roomEvents, gameEvents }, this.#notifier);
  }
}
