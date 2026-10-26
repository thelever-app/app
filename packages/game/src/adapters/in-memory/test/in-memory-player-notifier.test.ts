import { describe, expect, it } from 'vitest';
import { InMemoryPlayerNotifier } from '../in-memory-player-notifier.ts';
import { ProgressUpdatedEvent } from '../../../domain/events/progress-updated.event.ts';

describe('InMemoryPlayerNotifier', () => {
  describe('receivedBy', () => {
    it('should return the events notified to a player, in order', async () => {
      // Arrange
      const notifier = new InMemoryPlayerNotifier();
      const first = new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 2);
      const second = new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 2, 3);

      // Act
      await notifier.notify('TestAnaId', first);
      await notifier.notify('TestAnaId', second);

      // Assert
      expect(notifier.receivedBy('TestAnaId')).toEqual([first, second]);
    });

    it('should return nothing for a player who was not notified', () => {
      // Arrange
      const notifier = new InMemoryPlayerNotifier();

      // Act & Assert
      expect(notifier.receivedBy('TestAnaId')).toEqual([]);
    });
  });
});
