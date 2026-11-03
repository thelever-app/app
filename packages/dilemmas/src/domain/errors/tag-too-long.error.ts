export class TagTooLongError extends Error {
  constructor(tag: string, maxLength: number) {
    super(`the tag "${tag}" is longer than ${maxLength} characters`);
    this.name = 'TagTooLongError';
  }
}
