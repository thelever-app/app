import { describe, expect, it } from 'vitest';
import { FirebaseTokenVerifier } from '../../identity/firebase-token-verifier.ts';
import { InvalidTokenError } from '../../identity/token-verifier.ts';

/** Firebase as the verifier sees it: it accepts one token and rejects the rest as Firebase does. */
const firebase = {
  async verifyIdToken(token: string) {
    if (token === 'expired-token') {
      throw Object.assign(new Error('expired'), { code: 'auth/id-token-expired' });
    }
    if (token !== 'valid-token') {
      throw Object.assign(new Error('bad token'), { code: 'auth/argument-error' });
    }
    return { uid: 'firebase-uid' };
  },
};

/** Firebase failing for a reason that has nothing to do with the token. */
const failingFirebase = {
  async verifyIdToken(): Promise<{ uid: string }> {
    throw Object.assign(new Error('Auth is unreachable'), { code: 'app/network-error' });
  },
};

describe('FirebaseTokenVerifier', () => {
  it('should return the uid of a token Firebase accepts, as the identity', async () => {
    // Act
    const identity = await new FirebaseTokenVerifier(firebase).verify('valid-token');

    // Assert
    expect(identity).toBe('firebase-uid');
  });

  it.each(['forged', '', 'expired-token'])(
    'should turn a token Firebase rejects (%j) into InvalidTokenError',
    async (token) => {
      // Act & Assert
      await expect(new FirebaseTokenVerifier(firebase).verify(token)).rejects.toThrow(
        InvalidTokenError,
      );
    },
  );

  it('should let any other failure of Firebase through as a fault of the server', async () => {
    // Act & Assert
    await expect(new FirebaseTokenVerifier(failingFirebase).verify('valid-token')).rejects.toThrow(
      'Auth is unreachable',
    );
  });
});
