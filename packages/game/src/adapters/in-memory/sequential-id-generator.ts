import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';

/** Predictable ids (id-1, id-2…) so tests can rely on them. */
export class SequentialIdGenerator implements IdGenerator {
  #next = 1;

  generate(): string {
    return `id-${this.#next++}`;
  }
}
