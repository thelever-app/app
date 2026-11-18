export class InvalidEmojiError extends Error {
  constructor(value: string) {
    super(`a reaction is one emoji, and ${JSON.stringify(value)} is not`);
    this.name = 'InvalidEmojiError';
  }
}
