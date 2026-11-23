import { describe, expect, it } from 'vitest';
import { FirebaseAuthUsers } from '../../identity/firebase-auth-users.ts';

describe('FirebaseAuthUsers', () => {
  it('should delete the user of the identity', async () => {
    // Arrange
    const deleted: string[] = [];
    const users = new FirebaseAuthUsers({ deleteUser: async (uid) => void deleted.push(uid) });

    // Act
    await users.erase('uid-ana');

    // Assert
    expect(deleted).toEqual(['uid-ana']);
  });

  it('should take a user already deleted as deleted', async () => {
    // Arrange
    const users = new FirebaseAuthUsers({
      deleteUser: async () =>
        Promise.reject(Object.assign(new Error('gone'), { code: 'auth/user-not-found' })),
    });

    // Act & Assert
    await expect(users.erase('uid-ana')).resolves.toBeUndefined();
  });

  it('should fail when Firebase fails, so the deletion stays pending', async () => {
    // Arrange
    const users = new FirebaseAuthUsers({
      deleteUser: async () =>
        Promise.reject(Object.assign(new Error('down'), { code: 'auth/internal-error' })),
    });

    // Act & Assert
    await expect(users.erase('uid-ana')).rejects.toThrow('down');
  });
});
