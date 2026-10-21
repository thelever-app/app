import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';

/** Predictable ids (dilemma-1, dilemma-2…) so tests and the simulated room can rely on them. */
export class SequentialIdGenerator implements IdGenerator {
  readonly #prefix: string;
  #next = 1;

  constructor(prefix: string) {
    this.#prefix = prefix;
  }

  generate(): string {
    return `${this.#prefix}-${this.#next++}`;
  }
}
