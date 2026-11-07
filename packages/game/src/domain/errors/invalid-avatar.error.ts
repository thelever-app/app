export class InvalidAvatarError extends Error {
  constructor(face: string, color: string) {
    super(`there is no avatar with the face ${face} and the color ${color}`);
    this.name = 'InvalidAvatarError';
  }
}
