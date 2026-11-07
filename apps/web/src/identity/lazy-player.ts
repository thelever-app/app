import type { PlayerIdentity } from './anonymous-player.ts';

/**
 * The player, signed in the first time a call needs their token, not when the app starts: the
 * start screen and the simulated room need nobody signed in. A sign-in that fails is tried again
 * on the next call.
 */
export function lazyPlayer(signIn: () => Promise<PlayerIdentity>): PlayerIdentity {
  let player: Promise<PlayerIdentity> | undefined;
  const signedIn = () => {
    player ??= signIn().catch((error: unknown) => {
      player = undefined;
      throw error;
    });
    return player;
  };
  return {
    getToken: async (forceRefresh) => (await signedIn()).getToken(forceRefresh),
    getAppCheckToken: async (forceRefresh) => (await signedIn()).getAppCheckToken(forceRefresh),
  };
}
