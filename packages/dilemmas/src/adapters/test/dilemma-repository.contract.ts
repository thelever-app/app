import { describe, expect, it } from 'vitest';
import type {
  DilemmaCriteria,
  DilemmaRepository,
} from '../../application/ports/dilemma-repository.port.ts';
import { Dilemma, type DilemmaStatus, type Visibility } from '../../domain/entities/dilemma.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import { FixedIdGenerator } from '../../domain/test/support/fixed-id-generator.ts';

function dilemma(): Dilemma {
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

/** The dilemma at its second version, which drops an option and adds another one. */
function revised(): Dilemma {
  const revisedDilemma = dilemma();
  revisedDilemma.revise(
    {
      text: 'TestRevisedText',
      options: [
        { id: 'TestOptionId1', text: 'TestOption1' },
        { id: 'TestOptionId3', text: 'TestOption3' },
        { text: 'TestOption4' },
      ],
      category: 'loyalty',
      tags: ['testtag3'],
      minimumAge: 18,
    },
    new FixedIdGenerator('TestOptionId4'),
  );
  return revisedDilemma;
}

/** A dilemma of one option pair at its first version; what is not given, public and in the catalog. */
function catalogDilemma(
  id: string,
  facts: {
    readonly category?: Category;
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
      text: `TextOf${id}`,
      options: [
        { id: `${id}Option1`, text: 'TestOption1' },
        { id: `${id}Option2`, text: 'TestOption2' },
      ],
      category: facts.category ?? 'honesty',
      tags: [],
      minimumAge: facts.minimumAge ?? 16,
      status: facts.status ?? 'in-catalog',
    },
  });
}

const EVERYONE: DilemmaCriteria = { maximumMinimumAge: 16, status: 'in-catalog' };

async function idsFound(repository: DilemmaRepository, criteria: DilemmaCriteria) {
  return (await repository.search(criteria)).map(({ id }) => id);
}

/**
 * What every DilemmaRepository must do, in memory or in PostgreSQL (ADR 0002).
 * `create` returns a repository with no dilemmas.
 */
export function describeDilemmaRepositoryContract(
  name: string,
  create: () => Promise<DilemmaRepository>,
): void {
  describe(`${name} (DilemmaRepository contract)`, () => {
    describe('findById', () => {
      it('should find a saved dilemma as it was saved, with its options in order', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());

        // Act
        const found = await repository.findById('TestDilemmaId');

        // Assert
        expect(found?.toSnapshot()).toEqual(dilemma().toSnapshot());
      });

      it('should return undefined if the dilemma does not exist', async () => {
        // Arrange
        const repository = await create();

        // Act
        const found = await repository.findById('TestUnknownId');

        // Assert
        expect(found).toBeUndefined();
      });

      it('should return a copy, not the saved dilemma', async () => {
        // Arrange
        const repository = await create();
        const saved = dilemma();
        await repository.save(saved);

        // Act
        const found = await repository.findById('TestDilemmaId');

        // Assert
        expect(found).not.toBe(saved);
      });

      it('should find the current version of a revised dilemma', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(revised());

        // Act
        const found = await repository.findById('TestDilemmaId');

        // Assert
        expect(found?.toSnapshot()).toEqual(revised().toSnapshot());
      });
    });

    describe('findVersion', () => {
      it('should find an earlier version as it was saved', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(revised());

        // Act
        const found = await repository.findVersion('TestDilemmaId', 1);

        // Assert
        expect(found?.toSnapshot()).toEqual(dilemma().toSnapshot());
      });

      it('should find the current version too', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(revised());

        // Act
        const found = await repository.findVersion('TestDilemmaId', 2);

        // Assert
        expect(found?.toSnapshot()).toEqual(revised().toSnapshot());
      });

      it('should return undefined if the version does not exist', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());

        // Act
        const found = await repository.findVersion('TestDilemmaId', 2);

        // Assert
        expect(found).toBeUndefined();
      });

      it('should return undefined if the dilemma does not exist', async () => {
        // Arrange
        const repository = await create();

        // Act
        const found = await repository.findVersion('TestUnknownId', 1);

        // Assert
        expect(found).toBeUndefined();
      });
    });

    describe('save', () => {
      it('should keep a new status and visibility without making a new version', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        // As the moderation of a version will, until the dilemma has operations for it.
        const snapshot = dilemma().toSnapshot();
        const hidden = Dilemma.restore({
          ...snapshot,
          visibility: 'private',
          version: { ...snapshot.version, status: 'hidden-by-reports' },
        });

        // Act
        await repository.save(hidden);

        // Assert
        const found = await repository.findById('TestDilemmaId');
        expect(found?.toSnapshot()).toEqual(hidden.toSnapshot());
        expect((await repository.findVersion('TestDilemmaId', 1))?.status).toBe(
          'hidden-by-reports',
        );
      });

      it('should keep the earlier versions when it saves a new one', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());

        // Act
        await repository.save(revised());

        // Assert
        expect((await repository.findVersion('TestDilemmaId', 1))?.options).toHaveLength(3);
        expect((await repository.findVersion('TestDilemmaId', 2))?.text).toBe('TestRevisedText');
      });
    });

    describe('search', () => {
      it('should find the public dilemmas with that status, at their current version, by id', async () => {
        // Arrange
        const repository = await create();
        await repository.save(catalogDilemma('TestDilemmaB'));
        await repository.save(catalogDilemma('TestDilemmaA'));
        await repository.save(catalogDilemma('TestNewDilemma', { status: 'in-exploration' }));

        // Act
        const found = await repository.search(EVERYONE);

        // Assert
        expect(found.map((dilemma) => dilemma.toSnapshot())).toEqual([
          catalogDilemma('TestDilemmaA').toSnapshot(),
          catalogDilemma('TestDilemmaB').toSnapshot(),
        ]);
      });

      it('should find the dilemmas in exploration when asked for them', async () => {
        // Arrange
        const repository = await create();
        await repository.save(catalogDilemma('TestDilemma'));
        await repository.save(catalogDilemma('TestNewDilemma', { status: 'in-exploration' }));

        // Act
        const found = await idsFound(repository, { ...EVERYONE, status: 'in-exploration' });

        // Assert
        expect(found).toEqual(['TestNewDilemma']);
      });

      it('should leave out the private dilemmas', async () => {
        // Arrange
        const repository = await create();
        await repository.save(catalogDilemma('TestPrivateDilemma', { visibility: 'private' }));

        // Act
        const found = await idsFound(repository, EVERYONE);

        // Assert
        expect(found).toEqual([]);
      });

      it('should leave out the dilemmas for adults when the maximum minimum age is 16', async () => {
        // Arrange
        const repository = await create();
        await repository.save(catalogDilemma('TestDilemma'));
        await repository.save(catalogDilemma('TestAdultDilemma', { minimumAge: 18 }));

        // Act
        const forEveryone = await idsFound(repository, EVERYONE);
        const forAdults = await idsFound(repository, { ...EVERYONE, maximumMinimumAge: 18 });

        // Assert
        expect(forEveryone).toEqual(['TestDilemma']);
        expect(forAdults).toEqual(['TestAdultDilemma', 'TestDilemma']);
      });

      it('should find only the dilemmas of any of the categories given', async () => {
        // Arrange
        const repository = await create();
        await repository.save(catalogDilemma('TestHonestyDilemma'));
        await repository.save(catalogDilemma('TestLoyaltyDilemma', { category: 'loyalty' }));
        await repository.save(catalogDilemma('TestJusticeDilemma', { category: 'justice' }));

        // Act
        const found = await idsFound(repository, {
          ...EVERYONE,
          categories: ['loyalty', 'justice'],
        });

        // Assert
        expect(found).toEqual(['TestJusticeDilemma', 'TestLoyaltyDilemma']);
      });

      it('should find the dilemmas of every category when none is given', async () => {
        // Arrange
        const repository = await create();
        await repository.save(catalogDilemma('TestHonestyDilemma'));
        await repository.save(catalogDilemma('TestLoyaltyDilemma', { category: 'loyalty' }));

        // Act
        const found = await idsFound(repository, { ...EVERYONE, categories: [] });

        // Assert
        expect(found).toEqual(['TestHonestyDilemma', 'TestLoyaltyDilemma']);
      });

      it('should find only the dilemmas with the ids given', async () => {
        // Arrange
        const repository = await create();
        await repository.save(catalogDilemma('TestDilemmaA'));
        await repository.save(catalogDilemma('TestDilemmaB'));

        // Act
        const found = await idsFound(repository, { ...EVERYONE, dilemmaIds: ['TestDilemmaB'] });

        // Assert
        expect(found).toEqual(['TestDilemmaB']);
      });

      it('should look only at the current version of each dilemma', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(revised());

        // Act
        const asItWas = await idsFound(repository, { ...EVERYONE, categories: ['honesty'] });
        const asItIs = await repository.search({ ...EVERYONE, maximumMinimumAge: 18 });

        // Assert
        expect(asItWas).toEqual([]);
        expect(asItIs.map((found) => found.toSnapshot())).toEqual([revised().toSnapshot()]);
      });

      it('should return an empty list when nothing matches', async () => {
        // Arrange
        const repository = await create();

        // Act
        const found = await idsFound(repository, { ...EVERYONE, dilemmaIds: ['TestNoDilemma'] });

        // Assert
        expect(found).toEqual([]);
      });
    });
  });
}
