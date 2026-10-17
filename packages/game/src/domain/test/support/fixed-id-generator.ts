import type { IdGenerator } from '../../ports/id-generator.port.ts';

/** Hands out the given ids in order, so tests can name them. */
export class FixedIdGenerator implements IdGenerator {
  readonly #ids: string[];

  constructor(...ids: string[]) {
    this.#ids = ids;
  }

  generate(): string {
    const id = this.#ids.shift();
    if (id === undefined) throw new Error('FixedIdGenerator ran out of ids');
    return id;
  }
}
