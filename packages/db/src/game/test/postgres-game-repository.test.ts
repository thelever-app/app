import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { CONTRACT_DILEMMAS, describeGameRepositoryContract } from '@thelever-app/game/contracts';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import { PostgresGameRepository } from '../postgres-game-repository.ts';
import { PostgresRoomRepository } from '../postgres-room-repository.ts';

const database = useTestDatabase<Database>();

describeGameRepositoryContract('PostgresGameRepository', async () => {
  await emptyTables(database.db());
  await database
    .db()
    .insertInto('instances')
    .values({ id: 'TestInstanceId', seen_at: new Date() })
    .execute();
  const dilemmaRepository = new PostgresDilemmaRepository(database.db());
  const idGenerator = new SequentialIdGenerator('dilemma');
  const dilemmas = CONTRACT_DILEMMAS.map(({ text, options }) =>
    Dilemma.create(
      { text, options, language: 'es', category: 'honesty', tags: [], minimumAge: 16 },
      idGenerator,
    ),
  );
  for (const dilemma of dilemmas) await dilemmaRepository.save(dilemma);
  return {
    games: new PostgresGameRepository(database.db()),
    rooms: new PostgresRoomRepository(database.db(), 'TestInstanceId'),
    dilemmas: dilemmas.map((dilemma) => ({
      dilemmaId: dilemma.id,
      version: dilemma.version,
      optionIds: dilemma.options.map(({ id }) => id),
    })),
  };
});
