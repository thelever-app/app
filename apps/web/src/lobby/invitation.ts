/** The address that leads to join a room with its code: the one the link and the QR carry. */
export function invitationLink(code: string, origin = window.location.origin): string {
  return `${origin}/join/${code}`;
}

/**
 * Shares the invitation link of the room with the share sheet of the device or, where there is
 * none, copies it: whether it was copied, for the screen to say so. The browser may refuse to
 * copy it; the code stays on screen to give it by hand.
 */
export async function shareInvitation(
  code: string,
  text: string,
): Promise<'shared' | 'copied' | 'refused'> {
  const url = invitationLink(code);
  if (navigator.share) {
    // The player may close the share sheet: that is not an error.
    await navigator.share({ title: 'TheLever', text, url }).catch(() => {});
    return 'shared';
  }
  return navigator.clipboard.writeText(url).then(
    () => 'copied' as const,
    () => 'refused' as const,
  );
}

/** The code spelled out, so a screen reader reads it letter by letter. */
export function spelled(code: string): string {
  return code.split('').join(' ');
}
