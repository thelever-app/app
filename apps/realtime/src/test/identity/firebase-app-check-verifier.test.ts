import { describe, expect, it } from 'vitest';
import { InvalidAppCheckError } from '../../identity/app-check-verifier.ts';
import { FirebaseAppCheckVerifier } from '../../identity/firebase-app-check-verifier.ts';

/** App Check as the verifier sees it: it accepts one token and rejects the rest as Firebase does. */
const appCheck = {
  async verifyToken(token: string) {
    if (token === 'expired-token') {
      throw Object.assign(new Error('expired'), { code: 'app-check/app-check-token-expired' });
    }
    if (token !== 'valid-token') {
      throw Object.assign(new Error('bad token'), { code: 'app-check/invalid-argument' });
    }
    return { appId: 'test-app-id' };
  },
};

/**
 * App Check failing for a reason that has nothing to do with the token: Firebase Admin gives the
 * same code as for a forged token when it cannot download the public keys, with the cause inside.
 */
const appCheckWithoutKeys = {
  async verifyToken(): Promise<{ appId: string }> {
    throw Object.assign(new Error('Error fetching public keys'), {
      code: 'app-check/invalid-argument',
      cause: { code: 'key-fetch-error' },
    });
  },
};

describe('FirebaseAppCheckVerifier', () => {
  it('should let a token App Check accepts through', async () => {
    // Act & Assert
    await expect(
      new FirebaseAppCheckVerifier(appCheck).verify('valid-token'),
    ).resolves.toBeUndefined();
  });

  it.each([undefined, 'forged', 'expired-token'])(
    'should turn a missing or rejected token (%j) into InvalidAppCheckError',
    async (token) => {
      // Act & Assert
      await expect(new FirebaseAppCheckVerifier(appCheck).verify(token)).rejects.toThrow(
        InvalidAppCheckError,
      );
    },
  );

  it('should let a failure to fetch the public keys through, as a fault of the server', async () => {
    // Act & Assert
    await expect(
      new FirebaseAppCheckVerifier(appCheckWithoutKeys).verify('valid-token'),
    ).rejects.toThrow('Error fetching public keys');
  });
});
