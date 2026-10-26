import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { StartDecisionPhaseUseCase } from '../../use-cases/start-decision-phase.use-case.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { InMemoryGameRepository } from '../../../adapters/in-memory/in-memory-game-repository.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { TEST_DILEMMA_IDS, testCatalog } from './test-catalog.ts';

/** Ana hosts a room with Luis and Marta, and the game is in the decision phase. */
export async function gameInDecisionPhase() {
  const roomRepository = new InMemoryRoomRepository();
  const gameRepository = new InMemoryGameRepository();
  const idGenerator = new SequentialIdGenerator();
  const joinRoom = new JoinRoomUseCase(roomRepository, idGenerator);

  const { roomId, hostId: anaId } = await new CreateRoomUseCase(
    roomRepository,
    idGenerator,
  ).execute({ hostNickname: 'Ana' });
  const { playerId: luisId } = await joinRoom.execute({ roomId, nickname: 'Luis' });
  const { playerId: martaId } = await joinRoom.execute({ roomId, nickname: 'Marta' });
  const catalog = testCatalog();
  const { gameId } = await new StartDecisionPhaseUseCase(
    roomRepository,
    gameRepository,
    catalog,
    idGenerator,
  ).execute({ roomId, dilemmaIds: TEST_DILEMMA_IDS });

  return {
    roomRepository,
    gameRepository,
    idGenerator,
    catalog,
    roomId,
    gameId,
    anaId,
    luisId,
    martaId,
  };
}
