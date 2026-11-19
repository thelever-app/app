/**
 * Nothing for adults with someone under 18 in the room: no ambience for adults, no adults-only
 * dilemmas, and a host under 18 creates no room of an ambience for adults.
 */
export class MinorInRoomError extends Error {
  constructor(roomId: string) {
    super(`someone in room ${roomId} is under 18`);
    this.name = 'MinorInRoomError';
  }
}
