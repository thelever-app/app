import type { PersonalDataStore } from '@thelever-app/identity';

/** The part of Firebase Admin's Auth the deletion uses. */
export interface FirebaseUsers {
  deleteUser(uid: string): Promise<void>;
}

/**
 * The identity itself, as Firebase Auth keeps it: the anonymous user behind the uid, which the
 * device that deleted its data no longer signs in with. Deleting it twice deletes it once.
 * Firebase keeps nothing of it to download beyond the uid the other sections already name.
 */
export class FirebaseAuthUsers implements PersonalDataStore {
  readonly section = 'identity';
  readonly #users: FirebaseUsers;

  constructor(users: FirebaseUsers) {
    this.#users = users;
  }

  async export(): Promise<unknown> {
    return undefined;
  }

  async erase(identity: string): Promise<void> {
    try {
      await this.#users.deleteUser(identity);
    } catch (error) {
      if ((error as { code?: unknown }).code === 'auth/user-not-found') return;
      throw error;
    }
  }
}
