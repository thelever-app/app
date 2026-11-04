import { afterEach, describe, expect, it } from 'vitest';
import { documentActivity } from '../../src/room/document-activity.ts';

/** jsdom's page says it is visible; the test decides when it is not. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => setVisibility('visible'));

describe('documentActivity', () => {
  it('should tell whether the page is in sight', () => {
    // Arrange
    const activity = documentActivity(document);

    // Act
    setVisibility('hidden');

    // Assert
    expect(activity.isVisible()).toBe(false);
  });

  it('should tell each time the page is hidden or shown, until stopped', () => {
    // Arrange
    const seen: boolean[] = [];
    const stop = documentActivity(document).onVisibilityChange((visible) => seen.push(visible));

    // Act
    setVisibility('hidden');
    setVisibility('visible');
    stop();
    setVisibility('hidden');

    // Assert
    expect(seen).toEqual([false, true]);
  });

  it('should tell each touch, click or key, until stopped', () => {
    // Arrange
    let touches = 0;
    const stop = documentActivity(document).onInteraction(() => {
      touches += 1;
    });

    // Act
    document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('keydown'));
    stop();
    document.dispatchEvent(new Event('pointerdown'));

    // Assert
    expect(touches).toBe(2);
  });
});
