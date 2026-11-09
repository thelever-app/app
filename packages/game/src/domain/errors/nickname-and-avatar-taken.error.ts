export class NicknameAndAvatarTakenError extends Error {
  constructor(nickname: string, face: string, color: string) {
    super(`someone called ${nickname} already has the avatar ${face} ${color}`);
    this.name = 'NicknameAndAvatarTakenError';
  }
}
