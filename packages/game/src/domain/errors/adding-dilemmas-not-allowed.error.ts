export class AddingDilemmasNotAllowedError extends Error {
  constructor(roomId: string) {
    super(`players cannot add dilemmas in room ${roomId}`);
    this.name = 'AddingDilemmasNotAllowedError';
  }
}
