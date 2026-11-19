import {
  AcceptDocumentUseCase,
  GetConsentUseCase,
  type PublishedVersions,
} from '@thelever-app/consent';
import { InMemoryAcceptanceRepository } from '@thelever-app/consent/in-memory';
import { DeclareAgeUseCase, GetFirstAccessUseCase, OpenAppUseCase } from '@thelever-app/identity';
import { InMemoryFirstAccessRepository } from '@thelever-app/identity/in-memory';
import { describe, expect, it } from 'vitest';
import { FirstAccessSealProvider } from '../first-access-seal-provider.ts';

const PUBLISHED: PublishedVersions = [
  { document: 'terms-of-use', version: 1, asksAgain: true },
  { document: 'game-consent', version: 3, asksAgain: true },
];

function setUp() {
  const clock = { now: () => new Date('2026-11-19T10:00:00Z') };
  const firstAccesses = new InMemoryFirstAccessRepository();
  const acceptances = new InMemoryAcceptanceRepository();
  const getFirstAccess = new GetFirstAccessUseCase(firstAccesses, clock);
  const getConsent = new GetConsentUseCase(acceptances, PUBLISHED);
  return {
    openApp: new OpenAppUseCase(firstAccesses, clock),
    declareAge: new DeclareAgeUseCase(firstAccesses, clock),
    accept: new AcceptDocumentUseCase(acceptances, PUBLISHED, clock),
    seals: new FirstAccessSealProvider(getFirstAccess, getConsent),
  };
}

describe('FirstAccessSealProvider', () => {
  it('should seal with the game consent given and whether the player is under 18', async () => {
    // Arrange
    const { seals, openApp, declareAge, accept } = setUp();
    await openApp.execute({ identity: 'uid-luis', country: 'ES' });
    await declareAge.execute({ identity: 'uid-luis', birthYear: 2009, birthMonth: 5 });
    await accept.execute({ identity: 'uid-luis', document: 'game-consent', version: 3 });

    // Act & Assert
    expect(await seals.sealFor('uid-luis')).toEqual({
      gameConsentVersion: '3',
      researchConsentVersion: null,
      commercialLicenceConsentVersion: null,
      underEighteen: true,
    });
  });

  it('should seal who has no first access as under 18, without a game consent', async () => {
    // Arrange
    const { seals } = setUp();

    // Act & Assert
    expect(await seals.sealFor('uid-nobody')).toMatchObject({
      gameConsentVersion: '0',
      underEighteen: true,
    });
  });
});
