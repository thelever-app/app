import { InMemoryRoomRepository } from '../in-memory-room-repository.ts';
import { describeRoomRepositoryContract } from '../../test/room-repository.contract.ts';

describeRoomRepositoryContract('InMemoryRoomRepository', async () => new InMemoryRoomRepository());
