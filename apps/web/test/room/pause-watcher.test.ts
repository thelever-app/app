import { describe, expect, it } from 'vitest';
import { watchForPauses, type Pausable } from '../../src/room/pause-watcher.ts';
import { FakePageActivity } from '../support/fake-page-activity.ts';
import { FakeScheduler } from '../support/fake-socket.ts';

const FIVE_MINUTES = 5 * 60_000;
const THIRTY_MINUTES = 30 * 60_000;

/** A connection that only remembers what it was told. */
class RecordingConnection implements Pausable {
  readonly calls: ('pause' | 'resume')[] = [];

  pause(): void {
    this.calls.push('pause');
  }

  resume(): void {
    this.calls.push('resume');
  }
}

function watching({ visible = true } = {}) {
  const connection = new RecordingConnection();
  const page = new FakePageActivity({ visible });
  const scheduler = new FakeScheduler();
  const stop = watchForPauses(connection, { pageActivity: page, schedule: scheduler.schedule });
  const pending = () => scheduler.waits.filter(({ cancelled }) => !cancelled).map(({ ms }) => ms);
  return { connection, page, scheduler, stop, pending };
}

describe('watchForPauses', () => {
  it('should pause once the page has been hidden for 5 minutes', () => {
    // Arrange
    const { connection, page, scheduler, pending } = watching();
    page.hide();

    // Act
    scheduler.runLast();

    // Assert
    expect(pending()).toEqual([FIVE_MINUTES]);
    expect(connection.calls).toEqual(['pause']);
  });

  it('should not pause when the page is shown again before 5 minutes', () => {
    // Arrange
    const { connection, page, pending } = watching();
    page.hide();

    // Act
    page.show();

    // Assert
    expect(pending()).toEqual([THIRTY_MINUTES]);
    expect(connection.calls).toEqual([]);
  });

  it('should resume when the page is shown again after the pause', () => {
    // Arrange
    const { connection, page, scheduler } = watching();
    page.hide();
    scheduler.runLast();

    // Act
    page.show();

    // Assert
    expect(connection.calls).toEqual(['pause', 'resume']);
  });

  it('should pause once the page has been shown for 30 minutes without a touch', () => {
    // Arrange
    const { connection, scheduler, pending } = watching();

    // Act
    const waiting = pending();
    scheduler.runLast();

    // Assert
    expect(waiting).toEqual([THIRTY_MINUTES]);
    expect(connection.calls).toEqual(['pause']);
  });

  it('should count the 30 minutes again from each touch', () => {
    // Arrange
    const { connection, page, pending } = watching();

    // Act
    page.touch();
    page.touch();

    // Assert
    expect(pending()).toEqual([THIRTY_MINUTES]);
    expect(connection.calls).toEqual([]);
  });

  it('should resume at the first touch after a pause for not being used', () => {
    // Arrange
    const { connection, page, scheduler } = watching();
    scheduler.runLast();

    // Act
    page.touch();

    // Assert: the 30 minutes start again from the touch.
    expect(connection.calls).toEqual(['pause', 'resume']);
    expect(scheduler.waits.at(-1)).toMatchObject({ ms: THIRTY_MINUTES, cancelled: false });
  });

  it('should start counting the 5 minutes for a page that opens hidden', () => {
    // Act
    const { pending } = watching({ visible: false });

    // Assert
    expect(pending()).toEqual([FIVE_MINUTES]);
  });

  it('should stop listening and waiting once stopped', () => {
    // Arrange
    const { page, stop, pending } = watching();

    // Act
    stop();

    // Assert
    expect(page.listeners()).toBe(0);
    expect(pending()).toEqual([]);
  });
});
