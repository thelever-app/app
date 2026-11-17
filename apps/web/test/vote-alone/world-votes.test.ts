import { describe, expect, it, vi } from 'vitest';
import { worldVotes } from '../../src/vote-alone/world-votes.ts';

/** A storage of the device in memory, as localStorage keeps it. */
function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe('worldVotes', () => {
  it('should keep on the device the vote and the prediction of each dilemma, by its public id', () => {
    // Arrange
    const storage = memoryStorage();
    const votes = worldVotes(() => storage);

    // Act
    votes.save('TestPublicId', { optionId: 'TestOption', prediction: 70, version: 1 });

    // Assert: also for whoever reads the device later.
    expect(worldVotes(() => storage).voteOf('TestPublicId')).toEqual({
      optionId: 'TestOption',
      prediction: 70,
      version: 1,
    });
    expect(votes.voteOf('TestOtherPublicId')).toBeUndefined();
  });

  it('should give the same vote while it does not change, as a store of React needs', () => {
    // Arrange
    const votes = worldVotes(memoryStorage);
    votes.save('TestPublicId', { optionId: 'TestOption', prediction: 70, version: 1 });

    // Act & Assert
    expect(votes.voteOf('TestPublicId')).toBe(votes.voteOf('TestPublicId'));
  });

  it('should tell whoever subscribed when a vote is kept', () => {
    // Arrange
    const votes = worldVotes(memoryStorage);
    const onChange = vi.fn();
    votes.subscribe(onChange);

    // Act
    votes.save('TestPublicId', { optionId: 'TestOption', prediction: 70, version: 1 });

    // Assert
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('should keep the vote until the page closes on a device that keeps nothing', () => {
    // Arrange
    const votes = worldVotes(() => {
      throw new Error('blocked');
    });

    // Act
    votes.save('TestPublicId', { optionId: 'TestOption', prediction: 70, version: 1 });

    // Assert
    expect(votes.voteOf('TestPublicId')).toEqual({
      optionId: 'TestOption',
      prediction: 70,
      version: 1,
    });
  });

  it('should take as no vote what the device kept that is not one', () => {
    // Arrange
    const storage = memoryStorage();
    storage.setItem('thelever.worldVote.TestPublicId', '{"optionId":3,"prediction":5,"version":1}');

    // Act & Assert
    expect(worldVotes(() => storage).voteOf('TestPublicId')).toBeUndefined();
  });
});
