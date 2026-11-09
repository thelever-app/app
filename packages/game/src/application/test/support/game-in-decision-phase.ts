import { ChangeRoomSettingsUseCase } from '../../use-cases/change-room-settings.use-case.ts';
import { CreateRoomUseCase } from '../../use-cases/create-room.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { StartGameUseCase } from '../../use-cases/start-game.use-case.ts';
import { InMemoryRoomRepository } from '../../../adapters/in-memory/in-memory-room-repository.ts';
import { InMemoryGameRepository } from '../../../adapters/in-memory/in-memory-game-repository.ts';
import type { InMemoryDilemmaCatalog } from '../../../adapters/in-memory/in-memory-dilemma-catalog.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { SequentialRandomness } from '../../../adapters/in-memory/sequential-randomness.ts';
import { ManualClock } from '../../../adapters/in-memory/manual-clock.ts';
import type { RoomVariant } from '../../../domain/vos/room-settings.vo.ts';
import { KeepOrderRandomness } from '../../../domain/test/support/keep-order-randomness.ts';
import { EXPLORATION_SLOTS, testCatalog } from './test-catalog.ts';

/** What a test game copies from its room when it is created by hand. */
export const TEST_GAME_SETTINGS = {
  variant: 'nominal',
  groupNature: 'friends',
  place: 'together',
  dilemmaLanguage: 'es',
  timePerDilemmaSeconds: 60,
} as const;

/**
 * Ana hosts a room with Luis and Marta; she creates it and they join, all in the lobby. The game
 * it starts plays the test dilemmas in their order, and options and subsets in their order too.
 * The room has its default settings unless another variant is asked for.
 */
export async function lobbyOfThree(
  notifier = new InMemoryPlayerNotifier(),
  catalog: InMemoryDilemmaCatalog = testCatalog(),
  variant: RoomVariant = 'nominal',
) {
  const roomRepository = new InMemoryRoomRepository();
  const gameRepository = new InMemoryGameRepository();
  const idGenerator = new SequentialIdGenerator();
  const randomness = new SequentialRandomness();
  const clock = new ManualClock();
  const joinRoom = new JoinRoomUseCase({
    roomRepository,
    gameRepository,
    notifier,
    idGenerator,
    randomness,
  });

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
  if (variant !== 'nominal') {
    await new ChangeRoomSettingsUseCase(roomRepository, notifier).execute({
      roomId,
      playerId: anaId,
      changes: { variant },
    });
  }
  const startGame = new StartGameUseCase(
    {
      roomRepository,
      gameRepository,
      dilemmaCatalog: catalog,
      notifier,
      idGenerator,
      randomness: new KeepOrderRandomness(),
      clock,
    },
    EXPLORATION_SLOTS,
  );

  return {
    roomRepository,
    gameRepository,
    notifier,
    idGenerator,
    randomness,
    clock,
    catalog,
    startGame,
    roomId,
    anaId,
    luisId,
    martaId,
  };
}

/**
 * Two players joined, the room turned anonymous and the game started: the room has changed four
 * times before anyone connects.
 */
export const ROOM_VERSION_WHEN_THE_GAME_STARTS = 4;

/**
 * The same lobby, and Ana has started the game: it is in the decision phase. Anonymous unless
 * asked, so an answer is only the vote.
 */
export async function gameInDecisionPhase(
  notifier = new InMemoryPlayerNotifier(),
  variant: RoomVariant = 'anonymous',
) {
  const lobby = await lobbyOfThree(notifier, testCatalog(), variant);
  const { gameId } = await lobby.startGame.execute({ roomId: lobby.roomId, playerId: lobby.anaId });
  const game = await lobby.gameRepository.findById(gameId);

  return {
    ...lobby,
    gameId,
    /** In the order every player gets them. */
    dilemmaIds: game!.dilemmas.map(({ dilemmaId }) => dilemmaId),
  };
}
