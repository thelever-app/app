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
      await notifier.notify(['TestAnaId'], first);
      await notifier.notify(['TestAnaId'], second);

      // Assert
      expect(notifier.receivedBy('TestAnaId')).toEqual([first, second]);
    });

    it('should deliver an event to every player it is notified to', async () => {
      // Arrange
      const notifier = new InMemoryPlayerNotifier();
      const event = new ProgressUpdatedEvent('TestGameId', 'TestLuisId', 1, 2);

      // Act
      await notifier.notify(['TestAnaId', 'TestMartaId'], event);

      // Assert
      expect(notifier.receivedBy('TestAnaId')).toEqual([event]);
      expect(notifier.receivedBy('TestMartaId')).toEqual([event]);
    });

    it('should return nothing for a player who was not notified', () => {
      // Arrange
      const notifier = new InMemoryPlayerNotifier();

      // Act & Assert
      expect(notifier.receivedBy('TestAnaId')).toEqual([]);
    });
  });
});
