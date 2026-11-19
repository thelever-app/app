/**
 * The offer to install the app the browser makes once, early, and only if the app is not
 * installed: it is kept from the start, so the home screen can make it when the time comes.
 * Browsers that make none, as Safari on iOS, have their own way, which the home screen explains.
 */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let offered: InstallPromptEvent | undefined;
const listeners = new Set<() => void>();

function changed(): void {
  for (const listener of listeners) listener();
}

/** Keeps the offer of the browser from now on, and forgets it once the app is installed. */
export function keepInstallPrompt(target: Window = window): void {
  target.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    offered = event as InstallPromptEvent;
    changed();
  });
  target.addEventListener('appinstalled', () => {
    offered = undefined;
    changed();
  });
}

/** The offer kept, for useSyncExternalStore. */
export const installPrompt = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  current(): InstallPromptEvent | undefined {
    return offered;
  },
  /** Once used, the browser does not make it again. */
  use(): void {
    offered = undefined;
    changed();
  },
};
