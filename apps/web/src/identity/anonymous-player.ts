import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import type { WebConfig } from '../config/web-config.ts';

/** Who uses the screen, as the room server will check it. */
export interface PlayerIdentity {
  /** A token the server accepts: Firebase renews it when it is about to expire, or at once with `forceRefresh`. */
  getToken(forceRefresh: boolean): Promise<string>;
}

/**
 * Signs the player in with Firebase Auth, anonymously. The browser keeps the session, so after a
 * reload the player keeps the same identity and gets their player in the room back.
 */
export async function signInAnonymousPlayer({
  firebase,
  authEmulatorUrl,
}: WebConfig): Promise<PlayerIdentity> {
  const auth = getAuth(initializeApp(firebase));
  if (authEmulatorUrl) connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });

  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return { getToken: (forceRefresh) => user.getIdToken(forceRefresh) };
}
