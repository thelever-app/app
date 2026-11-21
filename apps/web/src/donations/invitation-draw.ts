/** How often the end of the game invites to donate: one game in three. */
export const INVITATION_ODDS = 1 / 3;

/**
 * Whether the end of a game invites to donate, drawn when it shows. Nothing is kept on the device
 * to decide it: counting games there would need the consent of the player.
 */
export function invitesToDonate(random: () => number = Math.random): boolean {
  return random() < INVITATION_ODDS;
}
