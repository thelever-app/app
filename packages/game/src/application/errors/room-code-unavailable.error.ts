/** No free code turned up after several tries: almost every code is taken. */
export class RoomCodeUnavailableError extends Error {
  constructor() {
    super('there is no free room code');
    this.name = 'RoomCodeUnavailableError';
  }
}
