import { Game } from '../../domain/entities/game.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface StartDecisionPhaseInput {
  readonly roomId: string;
  /** In the order every player gets them. */
  readonly dilemmaIds: readonly string[];
}

export interface StartDecisionPhaseOutput {
  readonly gameId: string;
}

/** Starts a new game in a room, with the players the room has now, in the decision phase. */
export class StartDecisionPhaseUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #idGenerator: IdGenerator;

  constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    idGenerator: IdGenerator,
  ) {
    this.#roomRepository = roomRepository;
    this.#gameRepository = gameRepository;
    this.#idGenerator = idGenerator;
  }

  async execute({
    roomId,
    dilemmaIds,
  }: StartDecisionPhaseInput): Promise<StartDecisionPhaseOutput> {
    const room = await this.#roomRepository.findById(roomId);
    if (!room) throw new RoomNotFoundError(roomId);

    const game = Game.create({ roomId: room.id, dilemmaIds }, this.#idGenerator);
    game.startDecisionPhase(room.players);
    await this.#gameRepository.save(game);

    return { gameId: game.id };
  }
}
