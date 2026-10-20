export class OptionCountError extends Error {
  constructor(count: number) {
    super(`a dilemma has 2 to 4 options, not ${count}`);
    this.name = 'OptionCountError';
  }
}
