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

/** The current version of a dilemma, as the dilemmas the adapter goes with know it. */
type CurrentVersionOf = (dilemmaId: string) => Promise<number | undefined>;

export class InMemoryWorldResultRepository implements WorldResultRepository {
  readonly #receipts = new Set<string>();
  readonly #counts = new Map<string, number>();
  readonly #published = new Map<string, number>();
  readonly #currentVersionOf: CurrentVersionOf;

  /** With the current version of each dilemma, which the database reads from its own tables. */
  constructor(currentVersionOf: CurrentVersionOf = async () => undefined) {
    this.#currentVersionOf = currentVersionOf;
  }

  async countVote(identity: string, { dilemmaId, version, position }: Ballot): Promise<boolean> {
    const receipt = JSON.stringify([identity, keyOf(dilemmaId, version)]);
    if (this.#receipts.has(receipt)) return false;
    this.#receipts.add(receipt);
    const key = keyOf(dilemmaId, version, position);
    this.#counts.set(key, (this.#counts.get(key) ?? 0) + 1);
    return true;
  }

  async publish(minimumNewAnswers: number): Promise<void> {
    const versionOf = (key: string) => JSON.stringify((JSON.parse(key) as unknown[]).slice(0, 2));
    const totals = (counts: ReadonlyMap<string, number>) => {
      const byVersion = new Map<string, number>();
      for (const [key, count] of counts) {
        byVersion.set(versionOf(key), (byVersion.get(versionOf(key)) ?? 0) + count);
      }
      return byVersion;
    };
    const published = totals(this.#published);
    for (const [version, answers] of totals(this.#counts)) {
      if (answers - (published.get(version) ?? 0) < minimumNewAnswers) continue;
      for (const key of [...this.#published.keys()]) {
        if (versionOf(key) === version) this.#published.delete(key);
      }
      for (const [key, count] of this.#counts) {
        if (versionOf(key) === version) this.#published.set(key, count);
      }
    }
  }

  async forgetReceiptsOfFormerVersions(): Promise<void> {
    for (const receipt of [...this.#receipts]) {
      const [, version] = JSON.parse(receipt) as [string, string];
      const [dilemmaId, number] = JSON.parse(version) as [string, number];
      const current = await this.#currentVersionOf(dilemmaId);
      if (current !== undefined && number < current) this.#receipts.delete(receipt);
    }
  }

  async receiptsOf(
    identity: string,
  ): Promise<{ readonly dilemmaId: string; readonly version: number }[]> {
    return [...this.#receipts].flatMap((receipt) => {
      const [owner, version] = JSON.parse(receipt) as [string, string];
      if (owner !== identity) return [];
      const [dilemmaId, number] = JSON.parse(version) as [string, number];
      return [{ dilemmaId, version: number }];
    });
  }

  async forgetReceiptsOf(identity: string): Promise<void> {
    for (const receipt of [...this.#receipts]) {
      if ((JSON.parse(receipt) as [string, string])[0] === identity) this.#receipts.delete(receipt);
    }
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
