import { describe, expect, it } from 'vitest';
import { InvalidPageError } from '../../application/errors/invalid-page.error.ts';
import type {
  DilemmaCriteria,
  DilemmaQueries,
} from '../../application/ports/dilemma-queries.port.ts';
import type { DilemmaRepository } from '../../application/ports/dilemma-repository.port.ts';
import { Dilemma, type DilemmaStatus, type Visibility } from '../../domain/entities/dilemma.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import { FixedIdGenerator } from '../../domain/test/support/fixed-id-generator.ts';

/** A dilemma of one option pair at its first version; what is not given, public and in the catalog. */
function catalogDilemma(
  id: string,
  facts: {
    readonly category?: Category;
    readonly text?: string;
    readonly tags?: readonly string[];
    readonly minimumAge?: MinimumAge;
    readonly status?: DilemmaStatus;
    readonly visibility?: Visibility;
  } = {},
): Dilemma {
  return Dilemma.restore({
    id,
    language: 'es',
    creator: { type: 'curation-team' },
    visibility: facts.visibility ?? 'public',
    version: {
      number: 1,
      text: facts.text ?? `TextOf${id}`,
      options: [
        { id: `${id}Option1`, text: 'TestOption1' },
        { id: `${id}Option2`, text: 'TestOption2' },
      ],
      category: facts.category ?? 'honesty',
      tags: facts.tags ?? [],
      minimumAge: facts.minimumAge ?? 16,
      status: facts.status ?? 'in-catalog',
    },
  });
}

/** A dilemma of three options at its first version, and at its second, for adults and in another category. */
function threeOptions(): Dilemma {
  return Dilemma.create(
    {
      text: 'TestDilemmaText',
      language: 'es',
      options: ['TestOption1', 'TestOption2', 'TestOption3'],
      category: 'honesty',
      tags: ['testtag1', 'testtag2'],
      minimumAge: 16,
    },
    new FixedIdGenerator('TestDilemmaId', 'TestOptionId1', 'TestOptionId2', 'TestOptionId3'),
  );
}

function revised(): Dilemma {
  const revisedDilemma = threeOptions();
  revisedDilemma.revise(
    {
      text: 'TestRevisedText',
      options: [
        { id: 'TestOptionId1', text: 'TestOption1' },
        { id: 'TestOptionId3', text: 'TestOption3' },
      ],
      category: 'loyalty',
      tags: ['testtag3'],
      minimumAge: 18,
    },
    new FixedIdGenerator(),
  );
  return revisedDilemma;
}

/** The English translation of the first version of threeOptions(). */
function translation(): Dilemma {
  return Dilemma.translate(
    threeOptions(),
    {
      language: 'en',
      text: 'TestTranslatedText',
      options: ['TestTranslatedOption1', 'TestTranslatedOption2', 'TestTranslatedOption3'],
      tags: [],
    },
    new FixedIdGenerator('TestTranslationId', 'TestTrOption1', 'TestTrOption2', 'TestTrOption3'),
  );
}

const EVERYONE: DilemmaCriteria = { maximumMinimumAge: 16, status: 'in-catalog' };

/** Big enough for every test to get a single page. */
const ALL = { size: 100 };

/**
 * What every DilemmaQueries must do, in memory or in PostgreSQL (ADR 0002). `create` returns the
 * queries and the repository that saves what they read, with no dilemmas.
 */
export function describeDilemmaQueriesContract(
  name: string,
  create: () => Promise<{
    readonly repository: DilemmaRepository;
    readonly queries: DilemmaQueries;
  }>,
): void {
  /** The ids of the dilemmas a search finds, on one page and in its order. */
  async function idsFound(queries: DilemmaQueries, criteria: DilemmaCriteria) {
    return (await queries.search(criteria, ALL)).summaries.map(({ id }) => id);
  }

  /** A repository with those dilemmas saved, and the queries on it. */
  async function saved(...dilemmas: Dilemma[]) {
    const { repository, queries } = await create();
    for (const dilemma of dilemmas) await repository.save(dilemma);
    return queries;
  }

  describe(`${name} (DilemmaQueries contract)`, () => {
    describe('search', () => {
      it('should give what a list shows of each dilemma, at its current version', async () => {
        // Arrange
        const queries = await saved(threeOptions(), revised());

        // Act
        const { summaries } = await queries.search({ ...EVERYONE, maximumMinimumAge: 18 }, ALL);

        // Assert
        expect(summaries).toEqual([
          {
            id: 'TestDilemmaId',
            version: 2,
            text: 'TestRevisedText',
            minimumAge: 18,
            category: 'loyalty',
            tags: ['testtag3'],
            optionCount: 2,
          },
        ]);
      });

      it('should find the public dilemmas with that status, by id', async () => {
        // Arrange
        const queries = await saved(
          catalogDilemma('TestDilemmaB'),
          catalogDilemma('TestDilemmaA'),
          catalogDilemma('TestNewDilemma', { status: 'in-exploration' }),
        );

        // Act
        const inCatalog = await idsFound(queries, EVERYONE);
        const inExploration = await idsFound(queries, { ...EVERYONE, status: 'in-exploration' });

        // Assert
        expect(inCatalog).toEqual(['TestDilemmaA', 'TestDilemmaB']);
        expect(inExploration).toEqual(['TestNewDilemma']);
      });

      it('should leave out the private dilemmas', async () => {
        // Arrange
        const queries = await saved(
          catalogDilemma('TestPrivateDilemma', { visibility: 'private' }),
        );

        // Act & Assert
        expect(await idsFound(queries, EVERYONE)).toEqual([]);
      });

      it('should leave out the dilemmas for adults when the maximum minimum age is 16', async () => {
        // Arrange
        const queries = await saved(
          catalogDilemma('TestDilemma'),
          catalogDilemma('TestAdultDilemma', { minimumAge: 18 }),
        );

        // Act
        const forEveryone = await idsFound(queries, EVERYONE);
        const forAdults = await idsFound(queries, { ...EVERYONE, maximumMinimumAge: 18 });

        // Assert
        expect(forEveryone).toEqual(['TestDilemma']);
        expect(forAdults).toEqual(['TestAdultDilemma', 'TestDilemma']);
      });

      it('should find only the dilemmas of any of the categories given, or of every one without them', async () => {
        // Arrange
        const queries = await saved(
          catalogDilemma('TestHonestyDilemma'),
          catalogDilemma('TestLoyaltyDilemma', { category: 'loyalty' }),
          catalogDilemma('TestJusticeDilemma', { category: 'justice' }),
        );

        // Act
        const two = await idsFound(queries, { ...EVERYONE, categories: ['loyalty', 'justice'] });
        const every = await idsFound(queries, EVERYONE);
        const none = await idsFound(queries, { ...EVERYONE, categories: [] });

        // Assert
        expect(two).toEqual(['TestJusticeDilemma', 'TestLoyaltyDilemma']);
        expect(every).toEqual(['TestHonestyDilemma', 'TestJusticeDilemma', 'TestLoyaltyDilemma']);
        expect(none).toEqual([]);
      });

      it('should find only the dilemmas with the ids given', async () => {
        // Arrange
        const queries = await saved(catalogDilemma('TestDilemmaA'), catalogDilemma('TestDilemmaB'));

        // Act
        const given = await idsFound(queries, { ...EVERYONE, dilemmaIds: ['TestDilemmaB'] });
        const none = await idsFound(queries, { ...EVERYONE, dilemmaIds: [] });

        // Assert
        expect(given).toEqual(['TestDilemmaB']);
        expect(none).toEqual([]);
      });

      it('should look only at the current version of each dilemma', async () => {
        // Arrange
        const queries = await saved(threeOptions(), revised());

        // Act & Assert
        expect(await idsFound(queries, { ...EVERYONE, categories: ['honesty'] })).toEqual([]);
      });

      it('should find only the dilemmas written or translated in the language given', async () => {
        // Arrange
        const queries = await saved(threeOptions(), translation());

        // Act
        const english = await idsFound(queries, { ...EVERYONE, language: 'en' });
        const spanish = await idsFound(queries, { ...EVERYONE, language: 'es' });
        const any = await idsFound(queries, EVERYONE);

        // Assert
        expect(english).toEqual(['TestTranslationId']);
        expect(spanish).toEqual(['TestDilemmaId']);
        expect(any).toEqual(['TestDilemmaId', 'TestTranslationId']);
      });

      describe('with a text', () => {
        const TRAM = 'Un tranvía sin frenos va hacia cinco personas que trabajan en la vía';

        /** The tram, tagged family, and a dilemma about something else. */
        function tramAndWallet() {
          return saved(
            catalogDilemma('TestTram', { text: TRAM, tags: ['familia'] }),
            catalogDilemma('TestWallet', {
              text: 'Encuentras una cartera con 200 €',
              tags: ['dinero'],
            }),
          );
        }

        it.each(['tranv', 'TRANVIA', 'freno', 'cinco personas'])(
          'should find part of a word of the text, without minding case or accents: %s',
          async (text) => {
            // Arrange
            const queries = await tramAndWallet();

            // Act & Assert
            expect(await idsFound(queries, { ...EVERYONE, text })).toEqual(['TestTram']);
          },
        );

        it('should find a word typed with a wrong letter', async () => {
          // Arrange
          const queries = await tramAndWallet();

          // Act & Assert
          expect(await idsFound(queries, { ...EVERYONE, text: 'tranbia' })).toEqual(['TestTram']);
        });

        it('should find part of a tag', async () => {
          // Arrange
          const queries = await tramAndWallet();

          // Act & Assert
          expect(await idsFound(queries, { ...EVERYONE, text: 'famil' })).toEqual(['TestTram']);
        });

        it('should find only the dilemmas where every word typed is in the text or the tags', async () => {
          // Arrange
          const queries = await tramAndWallet();

          // Act
          const both = await idsFound(queries, { ...EVERYONE, text: 'tranvía familia' });
          const one = await idsFound(queries, { ...EVERYONE, text: 'tranvía dinero' });
          const none = await idsFound(queries, { ...EVERYONE, text: 'amistad' });

          // Assert
          expect(both).toEqual(['TestTram']);
          expect(one).toEqual([]);
          expect(none).toEqual([]);
        });

        it('should put first a whole tag, then what is most like the text typed, then by id', async () => {
          // Arrange
          const queries = await saved(
            catalogDilemma('TestA', { text: 'Un tren con frenos rotos' }),
            catalogDilemma('TestB', { text: 'Pasa un tranvía' }),
            catalogDilemma('TestC', { text: 'Otra cosa', tags: ['tranvia'] }),
            catalogDilemma('TestD', { text: 'Pasa un tranvía lleno' }),
            catalogDilemma('TestE', { text: 'Pasa un tranvía lleno' }),
          );

          // Act & Assert
          expect(await idsFound(queries, { ...EVERYONE, text: 'tranvía' })).toEqual([
            'TestC',
            'TestB',
            'TestD',
            'TestE',
          ]);
        });

        it('should give the best matches page after page, in the same order', async () => {
          // Arrange
          const queries = await saved(
            catalogDilemma('TestA', { text: 'Un tren con frenos rotos' }),
            catalogDilemma('TestB', { text: 'Pasa un tranvía' }),
            catalogDilemma('TestC', { text: 'Otra cosa', tags: ['tranvia'] }),
            catalogDilemma('TestD', { text: 'Pasa un tranvía lleno' }),
            catalogDilemma('TestE', { text: 'Pasa un tranvía lleno' }),
          );
          const criteria = { ...EVERYONE, text: 'tranvía' };

          // Act
          const first = await queries.search(criteria, { size: 2 });
          const second = await queries.search(criteria, { size: 2, after: first.next! });

          // Assert
          expect(first.summaries.map(({ id }) => id)).toEqual(['TestC', 'TestB']);
          expect(second.summaries.map(({ id }) => id)).toEqual(['TestD', 'TestE']);
          expect(second.next).toBeUndefined();
        });
      });

      describe('by pages', () => {
        function five() {
          return saved(
            ...['TestA', 'TestB', 'TestC', 'TestD', 'TestE'].map((id) => catalogDilemma(id)),
          );
        }

        it('should give as many as asked for, and where the next page starts', async () => {
          // Arrange
          const queries = await five();

          // Act
          const first = await queries.search(EVERYONE, { size: 2 });
          const second = await queries.search(EVERYONE, { size: 2, after: first.next! });
          const third = await queries.search(EVERYONE, { size: 2, after: second.next! });

          // Assert
          expect(first.summaries.map(({ id }) => id)).toEqual(['TestA', 'TestB']);
          expect(second.summaries.map(({ id }) => id)).toEqual(['TestC', 'TestD']);
          expect(third.summaries.map(({ id }) => id)).toEqual(['TestE']);
          expect(third.next).toBeUndefined();
        });

        it('should give no next page when the last one is full', async () => {
          // Arrange
          const queries = await five();

          // Act
          const { next } = await queries.search(EVERYONE, { size: 5 });

          // Assert
          expect(next).toBeUndefined();
        });

        it('should throw InvalidPageError for a page that does not come from a search', async () => {
          // Arrange
          const queries = await five();

          // Act & Assert
          await expect(queries.search(EVERYONE, { size: 2, after: 'made up' })).rejects.toThrow(
            InvalidPageError,
          );
        });
      });
    });

    describe('idsOf', () => {
      it('should give every id of the public dilemmas that match, by id', async () => {
        // Arrange
        const queries = await saved(
          catalogDilemma('TestDilemmaB'),
          catalogDilemma('TestDilemmaA'),
          catalogDilemma('TestLoyaltyDilemma', { category: 'loyalty' }),
          catalogDilemma('TestAdultDilemma', { minimumAge: 18 }),
          catalogDilemma('TestNewDilemma', { status: 'in-exploration' }),
          catalogDilemma('TestPrivateDilemma', { visibility: 'private' }),
        );

        // Act
        const found = await queries.idsOf({ ...EVERYONE, categories: ['honesty'] });

        // Assert
        expect(found).toEqual(['TestDilemmaA', 'TestDilemmaB']);
      });

      it('should give only the dilemmas in the language given, at their current version', async () => {
        // Arrange
        const queries = await saved(threeOptions(), revised(), translation());

        // Act
        const english = await queries.idsOf({ ...EVERYONE, language: 'en' });
        const spanishHonesty = await queries.idsOf({
          ...EVERYONE,
          maximumMinimumAge: 18,
          language: 'es',
          categories: ['honesty'],
        });

        // Assert
        expect(english).toEqual(['TestTranslationId']);
        expect(spanishHonesty).toEqual([]);
      });
    });
  });
}
