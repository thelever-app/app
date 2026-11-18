import type { ReactionTarget } from '../../domain/entities/game.ts';
import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import type { SealProvider } from '../ports/seal-provider.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { notifyGame } from './notify-game.ts';

export interface ReactInput {
  readonly roomId: string;
  readonly playerId: string;
  /** The position of the round whose reveal the player reacts in. */
  readonly position: number;
  readonly target: ReactionTarget;
  readonly emoji: string;
}

/**
 * A player reacts with an emoji in the reveal of a round, to its dilemma or to a vote, and everyone
 * sees it. The reaction keeps the seal of the player at this moment. One that arrives once the
 * group moved on is lost, without an error.
 */
export class ReactUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #sealProvider: SealProvider;
  readonly #notifier: PlayerNotifier;

  constructor(ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly sealProvider: SealProvider;
    readonly notifier: PlayerNotifier;
  }) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#sealProvider = ports.sealProvider;
    this.#notifier = ports.notifier;
  }

  async execute({ roomId, playerId, position, target, emoji }: ReactInput): Promise<void> {
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    const player = room.players.find(({ id }) => id === playerId);
    if (!player) throw new PlayerNotInRoomError(playerId);

    const seal = await this.#sealProvider.sealFor(player.identity);
    if (!game.react(playerId, position, target, emoji, seal)) return;
    const gameEvents = game.pullEvents();
    await this.#gameRepository.save(game);

    await notifyGame({ room, game }, { roomEvents: [], gameEvents }, this.#notifier);
  }
}
