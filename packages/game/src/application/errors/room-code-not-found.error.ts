export class RoomCodeNotFoundError extends Error {
  constructor(code: string) {
    super(`no open room has the code ${code}`);
    this.name = 'RoomCodeNotFoundError';
  }
}
