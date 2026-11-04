import { initializeApp } from 'firebase/app';
import { getToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import type { WebConfig } from '../config/web-config.ts';

/** Who uses the screen, as the room server will check it. */
export interface PlayerIdentity {
  /** A token the server accepts: Firebase renews it when it is about to expire, or at once with `forceRefresh`. */
  getToken(forceRefresh: boolean): Promise<string>;
  /**
   * The App Check token of the device, the proof that the call comes from the app, or none where
   * the environment does not ask for it; with `forceRefresh`, a new one.
   */
  getAppCheckToken(forceRefresh: boolean): Promise<string | undefined>;
}

/**
 * Signs the player in with Firebase Auth, anonymously. The browser keeps the session, so after a
 * reload the player keeps the same identity and gets their player in the room back.
 */
export async function signInAnonymousPlayer({
  firebase,
  authEmulatorUrl,
  appCheckSiteKey,
}: WebConfig): Promise<PlayerIdentity> {
  const app = initializeApp(firebase);
  // Before Auth, so signing in also proves that the request comes from the app.
  const appCheck =
    appCheckSiteKey === undefined
      ? undefined
      : initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
  const auth = getAuth(app);
  if (authEmulatorUrl) connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });

  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return {
    getToken: (forceRefresh) => user.getIdToken(forceRefresh),
    getAppCheckToken: async (forceRefresh) =>
      appCheck && (await getToken(appCheck, forceRefresh)).token,
  };
}
