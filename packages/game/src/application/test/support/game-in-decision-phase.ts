import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { StartGameUseCase } from '../../use-cases/start-game.use-case.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { InMemoryGameRepository } from '../../../adapters/in-memory/in-memory-game-repository.ts';
import type { InMemoryDilemmaCatalog } from '../../../adapters/in-memory/in-memory-dilemma-catalog.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { SequentialRandomness } from '../../../adapters/in-memory/sequential-randomness.ts';
import { KeepOrderRandomness } from './keep-order-randomness.ts';
import { EXPLORATION_SLOTS, testCatalog } from './test-catalog.ts';

/** What a test game copies from its room when it is created by hand. */
export const TEST_GAME_SETTINGS = {
  variant: 'nominal',
  groupNature: 'friends',
  place: 'together',
  dilemmaLanguage: 'es',
  totalTimeInMinutes: 6,
} as const;

/**
 * Ana hosts a room with Luis and Marta; she creates it and they join, all in the lobby. The game
 * it starts plays the test dilemmas in their order.
 */
export async function lobbyOfThree(
  notifier = new InMemoryPlayerNotifier(),
  catalog: InMemoryDilemmaCatalog = testCatalog(),
) {
  const roomRepository = new InMemoryRoomRepository();
  const gameRepository = new InMemoryGameRepository();
  const idGenerator = new SequentialIdGenerator();
  const randomness = new SequentialRandomness();
  const joinRoom = new JoinRoomUseCase(roomRepository, notifier, idGenerator, randomness);

  const { roomId, hostId: anaId } = await new CreateRoomUseCase(
    roomRepository,
    idGenerator,
    randomness,
  ).execute({
    hostNickname: 'Ana',
    hostIdentity: 'TestAnaIdentity',
    groupNature: 'friends',
    place: 'together',
    dilemmaLanguage: 'es',
  });
  const { playerId: luisId } = await joinRoom.execute({
    roomId,
    nickname: 'Luis',
    identity: 'TestLuisIdentity',
  });
  const { playerId: martaId } = await joinRoom.execute({
    roomId,
    nickname: 'Marta',
    identity: 'TestMartaIdentity',
  });
  const startGame = new StartGameUseCase(
    {
      roomRepository,
      gameRepository,
      dilemmaCatalog: catalog,
      notifier,
      idGenerator,
      randomness: new KeepOrderRandomness(),
    },
    EXPLORATION_SLOTS,
  );

  return {
    roomRepository,
    gameRepository,
    notifier,
    idGenerator,
    randomness,
    catalog,
    startGame,
    roomId,
    anaId,
    luisId,
    martaId,
  };
}

/** Two players joined and the game started: the room has changed three times before anyone connects. */
export const ROOM_VERSION_WHEN_THE_GAME_STARTS = 3;

/** The same lobby, and Ana has started the game: it is in the decision phase. */
export async function gameInDecisionPhase(notifier = new InMemoryPlayerNotifier()) {
  const lobby = await lobbyOfThree(notifier);
  const { gameId } = await lobby.startGame.execute({ roomId: lobby.roomId, playerId: lobby.anaId });
  const game = await lobby.gameRepository.findById(gameId);

  return {
    ...lobby,
    gameId,
    /** In the order every player gets them. */
    dilemmaIds: game!.dilemmas.map(({ dilemmaId }) => dilemmaId),
  };
}
