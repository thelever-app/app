export class DuplicateTagError extends Error {
  constructor(tag: string) {
    super(`the tag "${tag}" is repeated`);
    this.name = 'DuplicateTagError';
  }
}
