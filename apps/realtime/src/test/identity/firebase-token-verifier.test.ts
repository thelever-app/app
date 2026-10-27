import { describe, expect, it } from 'vitest';
import { FirebaseTokenVerifier } from '../../identity/firebase-token-verifier.ts';
import { InvalidTokenError } from '../../identity/token-verifier.ts';

/** Firebase as the verifier sees it: it accepts one token and rejects the rest as Firebase does. */
const firebase = {
  async verifyIdToken(token: string) {
    if (token !== 'valid-token') {
      throw Object.assign(new Error('bad token'), { code: 'auth/argument-error' });
    }
    return { uid: 'firebase-uid' };
  },
};

describe('FirebaseTokenVerifier', () => {
  it('should return the uid of a token Firebase accepts, as the identity', async () => {
    // Act
    const identity = await new FirebaseTokenVerifier(firebase).verify('valid-token');

    // Assert
    expect(identity).toBe('firebase-uid');
  });

  it.each(['forged', ''])(
    'should turn a token Firebase rejects (%j) into InvalidTokenError',
    async (token) => {
      // Act & Assert
      await expect(new FirebaseTokenVerifier(firebase).verify(token)).rejects.toThrow(
        InvalidTokenError,
      );
    },
  );
});
