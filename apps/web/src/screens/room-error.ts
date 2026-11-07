import { RoomApiError } from '../room/room-api.ts';

/** Why the room server said no, as the screens translate it; «unknown» when it did not say. */
export function codeOf(error: unknown): string {
  return error instanceof RoomApiError && error.code ? error.code : 'unknown';
}
