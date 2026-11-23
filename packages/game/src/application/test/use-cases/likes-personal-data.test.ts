import { describe, expect, it } from 'vitest';
import { InMemoryDilemmaLikes } from '../../../adapters/in-memory/in-memory-dilemma-likes.ts';
import { SEAL_BEFORE_FIRST_ACCESS } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import {
  ExportLikesUseCase,
  ForgetLikesUseCase,
} from '../../use-cases/likes-personal-data.use-case.ts';

async function setUp() {
  const likes = new InMemoryDilemmaLikes();
  await likes.like({
    identity: 'TestAnaIdentity',
    dilemmaId: 'TestDilemma2',
    seal: SEAL_BEFORE_FIRST_ACCESS,
    at: new Date('2026-11-23T11:00:00Z'),
  });
  await likes.like({
    identity: 'TestAnaIdentity',
    dilemmaId: 'TestDilemma1',
    seal: SEAL_BEFORE_FIRST_ACCESS,
    at: new Date('2026-11-23T10:00:00Z'),
  });
  await likes.like({
    identity: 'TestLuisIdentity',
    dilemmaId: 'TestDilemma1',
    seal: SEAL_BEFORE_FIRST_ACCESS,
    at: new Date('2026-11-23T10:00:00Z'),
  });
  return {
    likes,
    exportLikes: new ExportLikesUseCase(likes),
    forgetLikes: new ForgetLikesUseCase(likes),
  };
}

describe('ExportLikesUseCase', () => {
  it('should give the likes of the identity, the oldest first', async () => {
    // Arrange
    const { exportLikes } = await setUp();

    // Act & Assert
    expect(await exportLikes.execute('TestAnaIdentity')).toEqual([
      { dilemmaId: 'TestDilemma1', givenIn: 'game', at: '2026-11-23T10:00:00.000Z' },
      { dilemmaId: 'TestDilemma2', givenIn: 'game', at: '2026-11-23T11:00:00.000Z' },
    ]);
    expect(await exportLikes.execute('TestMartaIdentity')).toBeUndefined();
  });
});

describe('ForgetLikesUseCase', () => {
  it('should take back every like of the identity, and only of it', async () => {
    // Arrange
    const { likes, forgetLikes } = await setUp();

    // Act
    await forgetLikes.execute('TestAnaIdentity');

    // Assert
    expect(await likes.likesOf('TestAnaIdentity')).toEqual([]);
    expect(likes.weightOf('TestDilemma1')).toBe(1);
  });
});
