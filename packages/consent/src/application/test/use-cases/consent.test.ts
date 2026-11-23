import { describe, expect, it } from 'vitest';
import { InMemoryAcceptanceRepository } from '../../../adapters/in-memory/in-memory-acceptance-repository.ts';
import { NotCurrentVersionError } from '../../../domain/errors/not-current-version.error.ts';
import type { PublishedVersions } from '../../../domain/vos/legal-document.vo.ts';
import { AcceptDocumentUseCase } from '../../use-cases/accept-document.use-case.ts';
import { GetConsentUseCase } from '../../use-cases/get-consent.use-case.ts';

const NOW = new Date('2026-11-19T10:00:00Z');
const PUBLISHED: PublishedVersions = [
  { document: 'terms-of-use', version: 2, asksAgain: true },
  { document: 'game-consent', version: 1, asksAgain: true },
];

function setUp() {
  const repository = new InMemoryAcceptanceRepository();
  const clock = { now: () => NOW };
  return {
    repository,
    accept: new AcceptDocumentUseCase(repository, PUBLISHED, clock),
    getConsent: new GetConsentUseCase(repository, PUBLISHED),
  };
}

describe('GetConsentUseCase', () => {
  it('should ask who accepted nothing for both documents, in their current versions', async () => {
    // Arrange
    const { getConsent } = setUp();

    // Act & Assert
    expect(await getConsent.execute('uid-ana')).toEqual({
      pending: ['terms-of-use', 'game-consent'],
      changed: [],
      current: { 'terms-of-use': 2, 'game-consent': 1 },
      gameConsentVersion: undefined,
      gameConsentWithdrawn: false,
    });
  });
});

describe('AcceptDocumentUseCase', () => {
  it('should keep the version accepted, and leave only what is still to accept', async () => {
    // Arrange
    const { accept, repository } = setUp();

    // Act
    const view = await accept.execute({
      identity: 'uid-ana',
      document: 'terms-of-use',
      version: 2,
    });

    // Assert
    expect(view.pending).toEqual(['game-consent']);
    expect((await repository.findByIdentity('uid-ana')).toSnapshot().accepted).toEqual([
      { document: 'terms-of-use', version: 2, acceptedAt: NOW, withdrawnAt: null },
    ]);
  });

  it('should tell the version of the game consent given, which seals the answers', async () => {
    // Arrange
    const { accept } = setUp();

    // Act
    const view = await accept.execute({
      identity: 'uid-ana',
      document: 'game-consent',
      version: 1,
    });

    // Assert
    expect(view.gameConsentVersion).toBe(1);
  });

  it('should not accept a version the app showed before the current one', async () => {
    // Arrange
    const { accept } = setUp();

    // Act & Assert
    await expect(
      accept.execute({ identity: 'uid-ana', document: 'terms-of-use', version: 1 }),
    ).rejects.toThrow(NotCurrentVersionError);
  });
});
