import { describe, expect, it } from 'vitest';
import { InMemoryFirstAccessRepository } from '../../../adapters/in-memory/in-memory-first-access-repository.ts';
import { AgeAlreadyDeclaredError } from '../../../domain/errors/age-already-declared.error.ts';
import { FirstAccessNotBegunError } from '../../errors/first-access-not-begun.error.ts';
import { DeclareAgeUseCase } from '../../use-cases/declare-age.use-case.ts';
import { GetFirstAccessUseCase } from '../../use-cases/get-first-access.use-case.ts';
import { OpenAppUseCase } from '../../use-cases/open-app.use-case.ts';

class FixedClock {
  current = new Date('2026-11-19T10:00:00Z');
  now(): Date {
    return this.current;
  }
}

function setUp() {
  const repository = new InMemoryFirstAccessRepository();
  const clock = new FixedClock();
  return {
    repository,
    clock,
    openApp: new OpenAppUseCase(repository, clock),
    declareAge: new DeclareAgeUseCase(repository, clock),
    getFirstAccess: new GetFirstAccessUseCase(repository, clock),
  };
}

describe('OpenAppUseCase', () => {
  it('should begin the first access in the region of the country, asking for the age', async () => {
    // Arrange
    const { openApp } = setUp();

    // Act
    const view = await openApp.execute({ identity: 'uid-ana', country: 'ES' });

    // Assert
    expect(view).toEqual({
      region: 'eea',
      step: 'age',
      underEighteen: true,
      monthOfBirthAskedFrom: 2008,
    });
  });

  it('should keep the region of the first time, wherever out of a blocked country it is opened after', async () => {
    // Arrange
    const { openApp } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });

    // Act
    const view = await openApp.execute({ identity: 'uid-ana', country: 'US' });

    // Assert
    expect(view.region).toBe('eea');
  });

  it('should stop whoever opens it in a blocked country, and keep it so', async () => {
    // Arrange
    const { openApp, getFirstAccess } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });

    // Act
    const view = await openApp.execute({ identity: 'uid-ana', country: 'GB' });

    // Assert
    expect(view.step).toBe('blocked-country');
    expect((await getFirstAccess.execute('uid-ana'))?.step).toBe('blocked-country');
  });

  it('should keep when the app was last opened', async () => {
    // Arrange
    const { openApp, repository, clock } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });
    clock.current = new Date('2026-12-24T20:00:00Z');

    // Act
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });

    // Assert
    const kept = await repository.findByIdentity('uid-ana');
    expect(kept?.toSnapshot().lastOpenedAt).toEqual(clock.current);
  });
});

describe('DeclareAgeUseCase', () => {
  it('should finish the first access of who reaches the minimum age', async () => {
    // Arrange
    const { openApp, declareAge } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });

    // Act
    const view = await declareAge.execute({ identity: 'uid-ana', birthYear: 1990 });

    // Assert
    expect(view).toEqual({
      region: 'eea',
      step: 'done',
      underEighteen: false,
      monthOfBirthAskedFrom: 2008,
    });
  });

  it('should keep the age, which cannot be declared again', async () => {
    // Arrange
    const { openApp, declareAge } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'US' });
    await declareAge.execute({ identity: 'uid-ana', birthYear: 2011, birthMonth: 6 });

    // Act & Assert
    await expect(declareAge.execute({ identity: 'uid-ana', birthYear: 1990 })).rejects.toThrow(
      AgeAlreadyDeclaredError,
    );
  });

  it('should not take the age of who never opened the app', async () => {
    // Arrange
    const { declareAge } = setUp();

    // Act & Assert
    await expect(declareAge.execute({ identity: 'uid-ana', birthYear: 1990 })).rejects.toThrow(
      FirstAccessNotBegunError,
    );
  });
});

describe('GetFirstAccessUseCase', () => {
  it('should say nothing of who never opened the app', async () => {
    // Arrange
    const { getFirstAccess } = setUp();

    // Act & Assert
    expect(await getFirstAccess.execute('uid-ana')).toBeUndefined();
  });

  it('should count the age on the day it is read', async () => {
    // Arrange: turns 18 in November 2026.
    const { openApp, declareAge, getFirstAccess, clock } = setUp();
    await openApp.execute({ identity: 'uid-ana', country: 'ES' });
    await declareAge.execute({ identity: 'uid-ana', birthYear: 2008, birthMonth: 11 });
    clock.current = new Date('2026-12-02T10:00:00Z');

    // Act
    const view = await getFirstAccess.execute('uid-ana');

    // Assert
    expect(view?.underEighteen).toBe(false);
  });
});
