export class TagCountError extends Error {
  constructor(count: number) {
    super(`a dilemma has up to 5 tags, not ${count}`);
    this.name = 'TagCountError';
  }
}
