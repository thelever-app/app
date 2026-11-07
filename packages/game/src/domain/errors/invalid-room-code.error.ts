export class InvalidRoomCodeError extends Error {
  constructor(code: string) {
    super(`${code} is not a room code`);
    this.name = 'InvalidRoomCodeError';
  }
}
