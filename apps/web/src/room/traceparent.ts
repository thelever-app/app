/**
 * A W3C trace context for a command the screen sends, so its trace starts on the device and the
 * room server continues it. Random ids only: nothing about the device or the player goes in it.
 */
export function newTraceparent(): string {
  return `00-${randomHex(16)}-${randomHex(8)}-01`;
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
