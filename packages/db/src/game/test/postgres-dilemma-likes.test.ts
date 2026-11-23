import { Dilemma } from '@thelever-app/dilemmas';
import { SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { describe, expect, it } from 'vitest';
import { PostgresDilemmaRepository } from '../../dilemmas/postgres-dilemma-repository.ts';
import type { Database } from '../../schema.ts';
import { emptyTables, useTestDatabase } from '../../test/support/test-database.ts';
import { PostgresDilemmaLikes } from '../postgres-dilemma-likes.ts';

const database = useTestDatabase<Database>();

const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: true,
  objectsToAnalytics: false,
};
const AT = new Date('2026-11-18T10:00:00.123Z');

/** A dilemma saved, which likes refer to. */
async function savedDilemma(): Promise<string> {
  await emptyTables(database.db());
  const dilemma = Dilemma.create(
    {
      text: 'TestText',
      options: ['TestPull', 'TestWait'],
      language: 'es',
      category: 'honesty',
      tags: [],
      minimumAge: 16,
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    },
    new SequentialIdGenerator('dilemma'),
  );
  await new PostgresDilemmaRepository(database.db()).save(dilemma);
  return dilemma.id;
}

describe('PostgresDilemmaLikes', () => {
  it('should keep one like per identity and dilemma, with the seal of the first one', async () => {
    // Arrange
    const dilemmaId = await savedDilemma();
    const likes = new PostgresDilemmaLikes(database.db());

    // Act
    await likes.like({ identity: 'TestLuisIdentity', dilemmaId, seal: SEAL, at: AT });
    await likes.like({
      identity: 'TestLuisIdentity',
      dilemmaId,
      seal: { ...SEAL, underEighteen: false },
      at: new Date(AT.getTime() + 1000),
    });

    // Assert
    const rows = await database.db().selectFrom('dilemma_likes').selectAll().execute();
    expect(rows).toEqual([
      {
        identity: 'TestLuisIdentity',
        dilemma_id: dilemmaId,
        given_in: 'game',
        liked_at: AT,
        game_consent_version: 'TestGameConsentVersion',
        research_consent_version: null,
        commercial_licence_consent_version: null,
        under_eighteen: true,
        objects_to_analytics: false,
      },
    ]);
    expect(await likes.hasLiked('TestLuisIdentity', dilemmaId)).toBe(true);
    expect(await likes.hasLiked('TestAnaIdentity', dilemmaId)).toBe(false);
  });

  it('should take back the like of an identity to a dilemma, and only that one', async () => {
    // Arrange
    const dilemmaId = await savedDilemma();
    const likes = new PostgresDilemmaLikes(database.db());
    await likes.like({ identity: 'TestLuisIdentity', dilemmaId, seal: SEAL, at: AT });
    await likes.like({ identity: 'TestAnaIdentity', dilemmaId, seal: SEAL, at: AT });

    // Act
    await likes.unlike('TestLuisIdentity', dilemmaId);
    await likes.unlike('TestMartaIdentity', dilemmaId);

    // Assert
    expect(await likes.hasLiked('TestLuisIdentity', dilemmaId)).toBe(false);
    expect(await likes.hasLiked('TestAnaIdentity', dilemmaId)).toBe(true);
  });

  it('should make a like given from the catalog count as one of a game', async () => {
    // Arrange
    const dilemmaId = await savedDilemma();
    await database
      .db()
      .insertInto('dilemma_likes')
      .values({
        identity: 'TestLuisIdentity',
        dilemma_id: dilemmaId,
        given_in: 'catalog',
        liked_at: AT,
        game_consent_version: 'TestOlderVersion',
        research_consent_version: null,
        commercial_licence_consent_version: null,
        under_eighteen: false,
        objects_to_analytics: false,
      })
      .execute();

    // Act
    await new PostgresDilemmaLikes(database.db()).like({
      identity: 'TestLuisIdentity',
      dilemmaId,
      seal: SEAL,
      at: AT,
    });

    // Assert
    const row = await database
      .db()
      .selectFrom('dilemma_likes')
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({ given_in: 'game', game_consent_version: 'TestGameConsentVersion' });
  });
});
