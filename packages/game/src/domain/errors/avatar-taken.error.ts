export class AvatarTakenError extends Error {
  constructor(face: string, color: string) {
    super(`the avatar ${face} ${color} is taken`);
    this.name = 'AvatarTakenError';
  }
}
