import {
  AcceptDocumentUseCase,
  GetConsentUseCase,
  type PublishedVersions,
} from '@thelever-app/consent';
import { InMemoryAcceptanceRepository } from '@thelever-app/consent/in-memory';
import { DeclareAgeUseCase, GetFirstAccessUseCase, OpenAppUseCase } from '@thelever-app/identity';
import { InMemoryFirstAccessRepository } from '@thelever-app/identity/in-memory';
import { describe, expect, it } from 'vitest';
import { FirstAccessGate } from '../first-access-gate.ts';
import { FirstAccessRequiredError } from '../first-access-required.error.ts';

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
    gate: new FirstAccessGate(getFirstAccess, getConsent),
  };
}

describe('FirstAccessGate', () => {
  it('should stop who never opened the app', async () => {
    // Arrange
    const { gate } = setUp();

    // Act & Assert
    await expect(gate.ensureDone('uid-ana')).rejects.toThrow(FirstAccessRequiredError);
  });

  it('should ask for the documents once the age is declared', async () => {
    // Arrange
    const { gate, openApp, declareAge } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });
    await declareAge.execute({ identity: 'uid-ana', birthYear: 1990 });

    // Act
    const status = await gate.statusOf('uid-ana');

    // Assert
    expect(status).toEqual({
      region: 'eea',
      step: 'documents',
      pending: ['terms-of-use', 'game-consent'],
      changed: [],
      current: { 'terms-of-use': 1, 'game-consent': 3 },
      underEighteen: false,
    });
    await expect(gate.ensureDone('uid-ana')).rejects.toThrow(FirstAccessRequiredError);
  });

  it('should let in who declared the age and accepted both documents', async () => {
    // Arrange
    const { gate, openApp, declareAge, accept } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });
    await declareAge.execute({ identity: 'uid-ana', birthYear: 1990 });
    await accept.execute({ identity: 'uid-ana', document: 'terms-of-use', version: 1 });
    await accept.execute({ identity: 'uid-ana', document: 'game-consent', version: 3 });

    // Act & Assert
    await expect(gate.ensureDone('uid-ana')).resolves.toBeUndefined();
  });

  it('should stop in the step of Identity before the documents', async () => {
    // Arrange: in a blocked country, the documents do not matter.
    const { gate, openApp, accept } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'GB' });
    await accept.execute({ identity: 'uid-ana', document: 'terms-of-use', version: 1 });

    // Act & Assert
    expect((await gate.statusOf('uid-ana'))?.step).toBe('blocked-country');
  });
});
