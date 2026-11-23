import type { Usage, UsageFact } from '../../application/ports/usage.port.ts';

/** Keeps the facts of use it gets, for tests and the simulated room, which has no analytics. */
export class InMemoryUsage implements Usage {
  readonly facts: UsageFact[] = [];

  async record(fact: UsageFact): Promise<void> {
    this.facts.push(fact);
  }
}
