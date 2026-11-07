export class PlayerExpelledError extends Error {
  constructor(roomId: string) {
    super(`the player was expelled from room ${roomId}`);
    this.name = 'PlayerExpelledError';
  }
}
