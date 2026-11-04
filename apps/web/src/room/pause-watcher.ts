import type { Schedule } from './websocket-room-connection.ts';

/** How long a hidden page keeps its connection: a quick look at another app does not drop it. */
const HIDDEN_FOR_MS = 5 * 60_000;
/** How long a page in sight keeps its connection without a touch, such as a laptop left open. */
const UNTOUCHED_FOR_MS = 30 * 60_000;

/** A connection that can be paused while nobody uses the page, and resumed. */
export interface Pausable {
  pause(): void;
  resume(): void;
}

/** What the page says about being used. */
export interface PageActivity {
  isVisible(): boolean;
  /** Tells the listener each time the page is shown or hidden; returns how to stop. */
  onVisibilityChange(listener: (visible: boolean) => void): () => void;
  /** Tells the listener each time the player touches, clicks or types; returns how to stop. */
  onInteraction(listener: () => void): () => void;
}

/**
 * Pauses the connection while nobody uses the page, hidden for 5 minutes or in sight for 30
 * without a touch, and resumes it when the player comes back: an open socket keeps an instance of
 * the room server alive, and paid for. Returns how to stop watching.
 */
export function watchForPauses(
  connection: Pausable,
  { pageActivity, schedule }: { readonly pageActivity: PageActivity; readonly schedule: Schedule },
): () => void {
  let cancelWait: (() => void) | undefined;
  let paused = false;

  const waitThenPause = (ms: number) => {
    cancelWait?.();
    cancelWait = schedule(() => {
      cancelWait = undefined;
      paused = true;
      connection.pause();
    }, ms);
  };
  const resume = () => {
    if (!paused) return;
    paused = false;
    connection.resume();
  };

  const stopVisibility = pageActivity.onVisibilityChange((visible) => {
    if (!visible) {
      waitThenPause(HIDDEN_FOR_MS);
      return;
    }
    resume();
    waitThenPause(UNTOUCHED_FOR_MS);
  });
  const stopInteraction = pageActivity.onInteraction(() => {
    resume();
    if (pageActivity.isVisible()) waitThenPause(UNTOUCHED_FOR_MS);
  });
  waitThenPause(pageActivity.isVisible() ? UNTOUCHED_FOR_MS : HIDDEN_FOR_MS);

  return () => {
    cancelWait?.();
    stopVisibility();
    stopInteraction();
  };
}
