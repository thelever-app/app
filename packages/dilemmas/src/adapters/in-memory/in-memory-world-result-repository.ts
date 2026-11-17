import type {
  Ballot,
  WorldResultRepository,
} from '../../application/ports/world-result-repository.port.ts';

/** The key of the answers to an option of a version, or of a version a vote was cast for. */
function keyOf(dilemmaId: string, version: number, position?: number): string {
  return JSON.stringify(
    position === undefined ? [dilemmaId, version] : [dilemmaId, version, position],
  );
}

/** What it keeps, as the database does: who voted each version, and how many voted each option. */
export interface WorldResultRecords {
  readonly receipts: readonly { readonly identity: string; readonly version: string }[];
  readonly counts: ReadonlyMap<string, number>;
}

export class InMemoryWorldResultRepository implements WorldResultRepository {
  readonly #receipts = new Set<string>();
  readonly #counts = new Map<string, number>();
  #published = new Map<string, number>();

  async countVote(identity: string, { dilemmaId, version, position }: Ballot): Promise<boolean> {
    const receipt = JSON.stringify([identity, keyOf(dilemmaId, version)]);
    if (this.#receipts.has(receipt)) return false;
    this.#receipts.add(receipt);
    const key = keyOf(dilemmaId, version, position);
    this.#counts.set(key, (this.#counts.get(key) ?? 0) + 1);
    return true;
  }

  async publish(): Promise<void> {
    this.#published = new Map(this.#counts);
  }

  async publishedCountsOf(
    dilemmaId: string,
    version: number,
  ): Promise<ReadonlyMap<number, number>> {
    const counts = new Map<number, number>();
    for (const [key, count] of this.#published) {
      const [id, number, position] = JSON.parse(key) as [string, number, number];
      if (id === dilemmaId && number === version) counts.set(position, count);
    }
    return new Map([...counts].sort(([a], [b]) => a - b));
  }

  /** Everything it keeps, for a test to check that nothing ties an identity to an option. */
  records(): WorldResultRecords {
    return {
      receipts: [...this.#receipts].map((receipt) => {
        const [identity, version] = JSON.parse(receipt) as [string, string];
        return { identity, version };
      }),
      counts: new Map(this.#counts),
    };
  }
}
