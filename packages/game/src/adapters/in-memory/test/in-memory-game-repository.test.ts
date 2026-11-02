import { InMemoryGameRepository } from '../in-memory-game-repository.ts';
import { InMemoryRoomRepository } from '../in-memory-room-repository.ts';
import { CONTRACT_DILEMMAS } from '../../test/dilemma-catalog.contract.ts';
import { describeGameRepositoryContract } from '../../test/game-repository.contract.ts';

describeGameRepositoryContract('InMemoryGameRepository', async () => ({
  games: new InMemoryGameRepository(),
  rooms: new InMemoryRoomRepository(),
  dilemmas: CONTRACT_DILEMMAS.map(({ options }, index) => ({
    dilemmaId: `TestDilemma${index + 1}`,
    version: 1,
    optionIds: options.map((_, optionIndex) => `TestDilemma${index + 1}Option${optionIndex + 1}`),
  })),
}));
