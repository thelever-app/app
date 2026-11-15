import { InvalidPageError } from '../../application/errors/invalid-page.error.ts';
import type {
  CandidateCriteria,
  DilemmaCriteria,
  DilemmaPage,
  DilemmaQueries,
  DilemmaSummary,
  PageRequest,
} from '../../application/ports/dilemma-queries.port.ts';
import type { DilemmaRepository } from '../../application/ports/dilemma-repository.port.ts';
import { rankOf } from './text-match.ts';
import {
  Dilemma,
  type DilemmaSnapshot,
  type TranslationOf,
  type VersionSnapshot,
} from '../../domain/entities/dilemma.ts';

/**
 * Stores snapshots, not the dilemmas themselves, so changes that were not saved are lost like in a database.
 * Each dilemma keeps every version it was saved at, by number. It answers the queries on what it
 * stores, as the database does.
 */
export class InMemoryDilemmaRepository implements DilemmaRepository, DilemmaQueries {
  readonly #dilemmas = new Map<
    string,
    {
      readonly dilemma: Omit<DilemmaSnapshot, 'version'>;
      readonly versions: ReadonlyMap<number, VersionSnapshot>;
    }
  >();

  async save(dilemma: Dilemma): Promise<void> {
    const { version, ...rest } = dilemma.toSnapshot();
    const versions = new Map(this.#dilemmas.get(dilemma.id)?.versions);
    versions.set(version.number, version);
    this.#dilemmas.set(dilemma.id, { dilemma: rest, versions });
  }

  async findById(id: string): Promise<Dilemma | undefined> {
    const stored = this.#dilemmas.get(id);
    return stored && this.findVersion(id, Math.max(...stored.versions.keys()));
  }

  async findVersion(id: string, version: number): Promise<Dilemma | undefined> {
    const stored = this.#dilemmas.get(id);
    const snapshot = stored?.versions.get(version);
    return stored && snapshot && Dilemma.restore({ ...stored.dilemma, version: snapshot });
  }

  async findTranslation(original: TranslationOf, language: string): Promise<Dilemma | undefined> {
    for (const [id, { dilemma, versions }] of this.#dilemmas) {
      if (dilemma.language !== language) continue;
      for (const version of versions.values()) {
        const of = version.translationOf;
        if (of?.dilemmaId === original.dilemmaId && of.version === original.version) {
          return this.findVersion(id, version.number);
        }
      }
    }
    return undefined;
  }

  async idsOf(criteria: CandidateCriteria): Promise<string[]> {
    return (await this.#matching(criteria)).map(({ id }) => id);
  }

  async search(criteria: DilemmaCriteria, { after, size }: PageRequest): Promise<DilemmaPage> {
    const found = await this.#matching(criteria);
    // A page starts after the dilemma the page before ended with, as the database does it.
    const start = after === undefined ? 0 : found.findIndex(({ id }) => id === idAfter(after)) + 1;
    if (start === 0 && after !== undefined) throw new InvalidPageError(after);
    const page = found.slice(start, start + size);
    const last = page.at(-1);
    return {
      summaries: page.map(summaryOf),
      ...(last && start + size < found.length && { next: JSON.stringify({ after: last.id }) }),
    };
  }

  /** The public dilemmas that match, at their current version: with a text, the best first, and by id. */
  async #matching(criteria: DilemmaCriteria): Promise<Dilemma[]> {
    const ids = [...this.#dilemmas.keys()].sort();
    const current = await Promise.all(ids.map((id) => this.findById(id)));
    const found = current.filter(
      (dilemma): dilemma is Dilemma =>
        dilemma !== undefined &&
        dilemma.visibility === 'public' &&
        dilemma.status === criteria.status &&
        dilemma.minimumAge <= criteria.maximumMinimumAge &&
        (criteria.language === undefined || dilemma.language === criteria.language) &&
        (!criteria.dilemmaIds || criteria.dilemmaIds.includes(dilemma.id)) &&
        (!criteria.categories || criteria.categories.includes(dilemma.category)),
    );
    const typed = criteria.text?.trim();
    if (!typed) return found;
    const ranked = found.flatMap((dilemma) => {
      const rank = rankOf(typed, dilemma);
      return rank ? [{ dilemma, rank }] : [];
    });
    // A stable sort: the same rank keeps the order by id.
    ranked.sort(
      (a, b) =>
        Number(b.rank.wholeTag) - Number(a.rank.wholeTag) || b.rank.similarity - a.rank.similarity,
    );
    return ranked.map(({ dilemma }) => dilemma);
  }
}

/** The id a page starts after, or undefined if it is not a page of a search. */
function idAfter(after: string): string | undefined {
  try {
    const { after: id } = JSON.parse(after) as { after?: unknown };
    return typeof id === 'string' ? id : undefined;
  } catch {
    return undefined;
  }
}

function summaryOf(dilemma: Dilemma): DilemmaSummary {
  const { id, version, text, minimumAge, category, tags, options } = dilemma;
  return { id, version, text, minimumAge, category, tags, optionCount: options.length };
}
