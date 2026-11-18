import { InvalidPageError } from '../../application/errors/invalid-page.error.ts';
import type {
  CandidateCriteria,
  DilemmaCandidate,
  DilemmaCriteria,
  DilemmaPage,
  DilemmaQueries,
  DilemmaSummary,
  PageRequest,
} from '../../application/ports/dilemma-queries.port.ts';
import type { DilemmaRepository } from '../../application/ports/dilemma-repository.port.ts';
import { numberOf } from '../../application/catalog-number.ts';
import { rankOf } from './text-match.ts';
import { hasGap } from '../../domain/vos/gap.ts';
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
  readonly #draws = new SeededDraws();
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

  async findByPublicId(publicId: string): Promise<Dilemma | undefined> {
    for (const [id, { dilemma }] of this.#dilemmas) {
      if (dilemma.publicId === publicId) return this.findById(id);
    }
    return undefined;
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

  async findWithPublicPage(): Promise<Dilemma[]> {
    const current = await this.#currentOfTheCatalog();
    const originals = new Map(
      current.filter((dilemma) => !dilemma.translationOf).map((dilemma) => [dilemma.id, dilemma]),
    );
    return current.filter((dilemma) => {
      if (!hasPage(dilemma)) return false;
      const of = dilemma.translationOf;
      if (!of) return true;
      const original = originals.get(of.dilemmaId);
      return original?.status === 'in-catalog' && original.version === of.version;
    });
  }

  async findWithdrawnFromCatalog(): Promise<Dilemma[]> {
    return (await this.#currentOfTheCatalog()).filter(
      (dilemma) =>
        !dilemma.translationOf && dilemma.status === 'withdrawn' && isPublishable(dilemma),
    );
  }

  /** The public dilemmas of the curated catalog at their current version, by id. */
  async #currentOfTheCatalog(): Promise<Dilemma[]> {
    const ids = [...this.#dilemmas.keys()].filter((id) => numberOf(id) !== undefined).sort();
    const current = await Promise.all(ids.map((id) => this.findById(id)));
    return current.filter(
      (dilemma): dilemma is Dilemma => dilemma !== undefined && dilemma.visibility === 'public',
    );
  }

  async candidatesOf(criteria: CandidateCriteria): Promise<DilemmaCandidate[]> {
    const drawable = (await this.#matching(criteria))
      .map(({ dilemma }) => ({
        id: dilemma.id,
        type: dilemma.type,
        scale: dilemma.scale,
        minimumAge: dilemma.minimumAge,
        hasGap: hasGapIn(dilemma),
      }))
      .filter(
        ({ id, hasGap, minimumAge }) =>
          (criteria.includeGap || !hasGap) &&
          (!criteria.onlyForAdults || minimumAge === 18) &&
          !criteria.excludedIds.includes(id),
      );
    const playedBy = new Map(
      criteria.playedBy.map(({ dilemmaId, players }) => [dilemmaId, players]),
    );
    const players = (id: string) => playedBy.get(id) ?? 0;
    return this.#draws
      .shuffle(drawable)
      .sort((one, other) => players(one.id) - players(other.id))
      .slice(0, criteria.count);
  }

  async search(criteria: DilemmaCriteria, { after, size }: PageRequest): Promise<DilemmaPage> {
    const found = await this.#matching(criteria);
    const end = after === undefined ? undefined : pageEndOf(after);
    const searchesText = Boolean(criteria.text?.trim());
    if (end && (end.rank !== undefined) !== searchesText) throw new InvalidPageError(after!);
    // A page starts right after where the page before ended, in the order of the search, as the
    // database does it: even if that dilemma has gone since.
    const rest = end ? found.filter((candidate) => comesAfter(candidate, end)) : found;
    const page = rest.slice(0, size);
    const last = page.at(-1);
    return {
      summaries: page.map(({ dilemma, compromising }) => ({ ...summaryOf(dilemma), compromising })),
      ...(last && rest.length > size && { next: JSON.stringify(pageEnd(last)) }),
    };
  }

  /**
   * The public dilemmas that match, at their current version: with a text, ranked, the best first
   * and then by id; without one, by id.
   */
  async #matching(criteria: DilemmaCriteria): Promise<Found[]> {
    const ids = [...this.#dilemmas.keys()].sort();
    const current = await Promise.all(ids.map((id) => this.findById(id)));
    const byId = new Map(
      current.flatMap((dilemma) => (dilemma ? [[dilemma.id, dilemma] as const] : [])),
    );
    // A translation the translator has not caught up with is compromising if its original is now.
    const compromisingNow = (dilemma: Dilemma): boolean => {
      const of = dilemma.translationOf;
      return (
        dilemma.compromising || (of !== undefined && byId.get(of.dilemmaId)?.compromising === true)
      );
    };
    const found = current
      .filter(
        (dilemma): dilemma is Dilemma =>
          dilemma !== undefined &&
          dilemma.visibility === 'public' &&
          dilemma.status === criteria.status &&
          dilemma.minimumAge <= criteria.maximumMinimumAge &&
          (criteria.includeCompromising || !compromisingNow(dilemma)) &&
          (criteria.language === undefined || dilemma.language === criteria.language) &&
          (!criteria.dilemmaIds || criteria.dilemmaIds.includes(dilemma.id)) &&
          (!criteria.categories || criteria.categories.includes(dilemma.category)),
      )
      .map((dilemma) => ({ dilemma, compromising: compromisingNow(dilemma) }));
    const typed = criteria.text?.trim();
    if (!typed) return found;
    const ranked = found.flatMap((matched) => {
      const rank = rankOf(typed, matched.dilemma);
      return rank ? [{ ...matched, rank }] : [];
    });
    // A stable sort: the same rank keeps the order by id.
    ranked.sort((a, b) => byRank(a.rank, b.rank));
    return ranked;
  }
}

interface Rank {
  readonly wholeTag: boolean;
  readonly similarity: number;
}

/** A dilemma a search found, whether it is compromising now, and its rank when it searched a text. */
interface Found {
  readonly dilemma: Dilemma;
  readonly compromising: boolean;
  readonly rank?: Rank;
}

/** Where a page ended: the last dilemma and, with a text, its rank. */
interface PageEnd {
  readonly id: string;
  readonly rank?: Rank;
}

/** Negative when `a` goes before `b`: a whole tag first, then the most alike. */
function byRank(a: Rank, b: Rank): number {
  return Number(b.wholeTag) - Number(a.wholeTag) || b.similarity - a.similarity;
}

function pageEnd({ dilemma, rank }: Found): PageEnd {
  return { id: dilemma.id, ...(rank && { rank }) };
}

/** Whether a dilemma found goes after where the page ended, in the order of the search. */
function comesAfter({ dilemma, rank }: Found, end: PageEnd): boolean {
  const byOrder = rank && end.rank ? byRank(end.rank, rank) : 0;
  return byOrder < 0 || (byOrder === 0 && dilemma.id > end.id);
}

/** Where the page before ended, or InvalidPageError if `after` is not where a page ends. */
function pageEndOf(after: string): PageEnd {
  try {
    const end = JSON.parse(after) as Partial<PageEnd> | null;
    const rank = end?.rank;
    if (typeof end?.id === 'string') {
      if (rank === undefined) return { id: end.id };
      if (typeof rank.wholeTag === 'boolean' && typeof rank.similarity === 'number') {
        return { id: end.id, rank: { wholeTag: rank.wholeTag, similarity: rank.similarity } };
      }
    }
  } catch {
    // Not a page of a search.
  }
  throw new InvalidPageError(after);
}

function summaryOf(dilemma: Dilemma): DilemmaSummary {
  const { id, version, text, minimumAge, category, tags, options, compromising, type, scale } =
    dilemma;
  return {
    id,
    version,
    text,
    minimumAge,
    category,
    tags,
    optionCount: options.length,
    compromising,
    type,
    scale,
    hasGap: hasGapIn(dilemma),
  };
}

/**
 * Draws as the database does, with numbers that look random from a fixed seed (mulberry32): each
 * draw differs from the one before, and a test repeats itself.
 */
class SeededDraws {
  #state = 0;

  /** A copy in random order (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const other = Math.floor(this.#next() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other] as T, shuffled[index] as T];
    }
    return shuffled;
  }

  /** From 0 to 1, 1 not included. */
  #next(): number {
    this.#state = (this.#state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(this.#state ^ (this.#state >>> 15), 1 | this.#state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }
}

/** Whether the text of the dilemma or any of its options has the gap. */
function hasGapIn({ text, options }: Dilemma): boolean {
  return hasGap([text, ...options.map((option) => option.text)]);
}

/** Whether its current version has a page of its own: in the catalog, and publishable. */
function hasPage(dilemma: Dilemma): boolean {
  return dilemma.status === 'in-catalog' && isPublishable(dilemma);
}

/** Whether its current version could be on the web: for everyone, not compromising, named and argued. */
function isPublishable(dilemma: Dilemma): boolean {
  return (
    dilemma.isSuitableForMinors() &&
    !dilemma.compromising &&
    dilemma.name !== undefined &&
    dilemma.arguments !== undefined
  );
}
