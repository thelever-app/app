/** The address that leads to join a room with its code: the one the link and the QR carry. */
export function invitationLink(code: string, origin = window.location.origin): string {
  return `${origin}/join/${code}`;
}

/** The code spelled out, so a screen reader reads it letter by letter. */
export function spelled(code: string): string {
  return code.split('').join(' ');
}
