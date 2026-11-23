import { getApps } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';

/** Where the app keeps everything of the player on the device: every key starts so. */
const KEY_PREFIX = 'thelever.';
/** The access code of a closed environment is the environment's, not the player's: it stays. */
const KEPT_KEYS: readonly string[] = ['thelever.accessCode'];

function forgetIn(storage: Storage): void {
  try {
    for (const key of Object.keys(storage)) {
      if (key.startsWith(KEY_PREFIX) && !KEPT_KEYS.includes(key)) storage.removeItem(key);
    }
  } catch {
    // A device that keeps nothing has nothing to forget.
  }
}

/**
 * The player asked for their data to be deleted: the device starts from scratch at once, as on a
 * new one. It signs out of the identity, which the deletion job deletes, and forgets everything the
 * app kept on it. The next opening signs in as someone new and shows the welcome.
 */
export async function forgetDevice(
  storages: readonly Storage[] = [localStorage, sessionStorage],
): Promise<void> {
  for (const storage of storages) forgetIn(storage);
  const [app] = getApps();
  if (app) await signOut(getAuth(app));
}
