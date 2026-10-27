import { composeRealtimeServer } from './composition.ts';
import { InvalidTokenError, type TokenVerifier } from './identity/token-verifier.ts';

const port = Number(process.env.PORT ?? 3000);

// Firebase Admin is not wired yet, so no token is valid: the server answers /health
// and refuses every room request.
const tokenVerifier: TokenVerifier = {
  async verify() {
    throw new InvalidTokenError();
  },
};

const { http } = await composeRealtimeServer({ tokenVerifier, pingIntervalMs: 30_000 });

http.listen(port, () => {
  console.log(`realtime listening on http://localhost:${port}`);
});
