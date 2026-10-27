import { describe, expect, it } from 'vitest';
import { KeyedLock } from '../../concurrency/keyed-lock.ts';

/** Lets every pending promise run, so a holder that could enter has entered. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('KeyedLock', () => {
  it('should grant a free key at once', async () => {
    // Arrange
    const lock = new KeyedLock();

    // Act
    const release = await lock.acquire('game-1');

    // Assert
    expect(release).toBeTypeOf('function');
  });

  it('should make a second holder of the same key wait until the first releases it', async () => {
    // Arrange
    const lock = new KeyedLock();
    const releaseFirst = await lock.acquire('game-1');
    let secondEntered = false;
    const second = lock.acquire('game-1').then((release) => {
      secondEntered = true;
      return release;
    });

    // Act
    await settle();
    const enteredBeforeRelease = secondEntered;
    releaseFirst();
    await second;

    // Assert
    expect(enteredBeforeRelease).toBe(false);
    expect(secondEntered).toBe(true);
  });

  it('should grant a key in the order it was asked for', async () => {
    // Arrange
    const lock = new KeyedLock();
    const order: string[] = [];
    const releaseFirst = await lock.acquire('game-1');
    const waiting = ['second', 'third'].map(async (name) => {
      const release = await lock.acquire('game-1');
      order.push(name);
      release();
    });

    // Act
    releaseFirst();
    await Promise.all(waiting);

    // Assert
    expect(order).toEqual(['second', 'third']);
  });

  it('should not make a key wait for another one', async () => {
    // Arrange
    const lock = new KeyedLock();
    await lock.acquire('game-1');

    // Act
    const releaseOther = await lock.acquire('game-2');

    // Assert
    expect(releaseOther).toBeTypeOf('function');
  });

  it('should ignore a second release, so it never frees the key for somebody else', async () => {
    // Arrange
    const lock = new KeyedLock();
    const releaseFirst = await lock.acquire('game-1');
    const second = lock.acquire('game-1');
    releaseFirst();
    const releaseSecond = await second;
    let thirdEntered = false;
    const third = lock.acquire('game-1').then((release) => {
      thirdEntered = true;
      return release;
    });

    // Act
    releaseFirst();
    await settle();

    // Assert
    expect(thirdEntered).toBe(false);
    releaseSecond();
    (await third)();
  });

  it('should grant the key again once every holder has released it', async () => {
    // Arrange
    const lock = new KeyedLock();
    (await lock.acquire('game-1'))();

    // Act
    const release = await lock.acquire('game-1');

    // Assert
    expect(release).toBeTypeOf('function');
  });
});
