import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { composeRealtimeServer } from './composition.ts';
import { FirebaseTokenVerifier } from './identity/firebase-token-verifier.ts';

const port = Number(process.env.PORT ?? 3000);
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not set');

// With FIREBASE_AUTH_EMULATOR_HOST set, Firebase Admin trusts the tokens of the local emulator instead.
const firebase = initializeApp({ projectId });
const tokenVerifier = new FirebaseTokenVerifier(getAuth(firebase));

const { http } = await composeRealtimeServer({ tokenVerifier, pingIntervalMs: 30_000 });

http.listen(port, () => {
  console.log(`realtime listening on http://localhost:${port}`);
});
