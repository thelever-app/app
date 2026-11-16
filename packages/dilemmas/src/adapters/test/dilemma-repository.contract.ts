import { describe, expect, it } from 'vitest';
import type { DilemmaRepository } from '../../application/ports/dilemma-repository.port.ts';
import { Dilemma, type DilemmaSnapshot } from '../../domain/entities/dilemma.ts';
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
    new FixedIdGenerator(
      'TestDilemmaId',
      'TestOptionId1',
      'TestOptionId2',
      'TestOptionId3',
      'TestDilemmaPublicId',
    ),
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

/** The English translation of the first version of dilemma(). */
function translation(): Dilemma {
  return Dilemma.translate(
    dilemma(),
    {
      language: 'en',
      name: 'TestTranslatedName',
      text: 'TestTranslatedText',
      options: ['TestTranslatedOption1', 'TestTranslatedOption2', 'TestTranslatedOption3'],
      tags: ['testtranslatedtag'],
    },
    new FixedIdGenerator(
      'TestTranslationId',
      'TestTranslationOptionId1',
      'TestTranslationOptionId2',
      'TestTranslationOptionId3',
      'TestTranslationPublicId',
    ),
  );
}

/** Arguments for the options of the first version of dilemma(). */
const ARGUMENTS = {
  context: 'TestContext',
  options: ['TestOptionId1', 'TestOptionId2', 'TestOptionId3'].map((optionId) => ({
    optionId,
    for: `TestFor${optionId}`,
    against: `TestAgainst${optionId}`,
  })),
};

/** A dilemma of the curated catalog with that number, in Spanish, in the catalog and named unless said. */
function curated(number: number, minimumAge: MinimumAge = 16, named = true): Dilemma {
  const id = `dlm-${number}`;
  return Dilemma.create(
    {
      text: `TestText${number}`,
      language: 'es',
      ...(named ? { name: `TestName${number}` } : {}),
      options: ['TestOptionA', 'TestOptionB'],
      category: 'honesty',
      tags: ['testtag'],
      minimumAge,
    },
    new FixedIdGenerator(id, `${id}-option-1`, `${id}-option-2`, `${id}-public`),
  );
}

/** Its English translation, as the import makes it. */
function inEnglish(original: Dilemma): Dilemma {
  const options = ['TestOptionAEn', 'TestOptionBEn'];
  const id = `${original.id}-en`;
  return Dilemma.translate(
    original,
    {
      language: 'en',
      name: `${original.name}En`,
      text: `${original.text}En`,
      options,
      tags: [],
    },
    new FixedIdGenerator(
      id,
      ...options.map((_, index) => `${id}-option-${index + 1}`),
      `${id}-public`,
    ),
  );
}

/** The dilemma with its arguments reviewed. */
function argued(dilemma: Dilemma): Dilemma {
  dilemma.argue({
    context: 'TestContext',
    options: dilemma.options.map(({ id }) => ({
      optionId: id,
      for: `TestFor${id}`,
      against: `TestAgainst${id}`,
    })),
  });
  return dilemma;
}

/** The dilemma with its current version in that status. */
function inStatus(dilemma: Dilemma, status: DilemmaSnapshot['version']['status']): Dilemma {
  const snapshot = dilemma.toSnapshot();
  return Dilemma.restore({ ...snapshot, version: { ...snapshot.version, status } });
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

    describe('findByPublicId', () => {
      it('should find the dilemma with that public id at its current version', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(revised());

        // Act
        const found = await repository.findByPublicId('TestDilemmaPublicId');

        // Assert
        expect(found?.id).toBe('TestDilemmaId');
        expect(found?.version).toBe(2);
      });

      it('should return undefined if no dilemma has that public id', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());

        // Act
        const found = await repository.findByPublicId('TestDilemmaId');

        // Assert
        expect(found).toBeUndefined();
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

      it('should keep a new name and new arguments without making a new version', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        const argued = dilemma();
        argued.rename('TestName');
        argued.argue(ARGUMENTS);

        // Act
        await repository.save(argued);

        // Assert
        const found = await repository.findById('TestDilemmaId');
        expect(found?.version).toBe(1);
        expect(found?.name).toBe('TestName');
        expect(found?.arguments).toEqual(ARGUMENTS);
      });

      it('should keep the arguments of each version apart', async () => {
        // Arrange
        const repository = await create();
        const argued = dilemma();
        argued.argue(ARGUMENTS);
        await repository.save(argued);

        // Act
        await repository.save(revised());

        // Assert
        expect((await repository.findVersion('TestDilemmaId', 1))?.arguments).toEqual(ARGUMENTS);
        expect((await repository.findVersion('TestDilemmaId', 2))?.arguments).toBeUndefined();
      });

      it('should keep a translation with what it translates', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());

        // Act
        await repository.save(translation());

        // Assert
        expect((await repository.findById('TestTranslationId'))?.toSnapshot()).toEqual(
          translation().toSnapshot(),
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

    describe('findTranslation', () => {
      it('should find the translation of that version into that language', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(translation());

        // Act
        const found = await repository.findTranslation(
          { dilemmaId: 'TestDilemmaId', version: 1 },
          'en',
        );

        // Assert
        expect(found?.toSnapshot()).toEqual(translation().toSnapshot());
      });

      it('should find the version of the translation that translates each version', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(translation());
        const original = revised();
        const retranslated = translation();
        retranslated.retranslate(
          original,
          {
            text: 'TestRetranslatedText',
            options: ['TestTranslatedOption1', 'TestTranslatedOption3', 'TestTranslatedOption4'],
            tags: [],
          },
          new FixedIdGenerator(),
        );
        await repository.save(original);
        await repository.save(retranslated);

        // Act
        const first = await repository.findTranslation(
          { dilemmaId: 'TestDilemmaId', version: 1 },
          'en',
        );
        const second = await repository.findTranslation(
          { dilemmaId: 'TestDilemmaId', version: 2 },
          'en',
        );

        // Assert
        expect(first?.text).toBe('TestTranslatedText');
        expect(second?.version).toBe(2);
        expect(second?.text).toBe('TestRetranslatedText');
      });

      it('should return undefined if there is no translation into that language or of that version', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(translation());

        // Act
        const otherLanguage = await repository.findTranslation(
          { dilemmaId: 'TestDilemmaId', version: 1 },
          'fr',
        );
        const otherVersion = await repository.findTranslation(
          { dilemmaId: 'TestDilemmaId', version: 2 },
          'en',
        );

        // Assert
        expect(otherLanguage).toBeUndefined();
        expect(otherVersion).toBeUndefined();
      });
    });

    describe('findWithPublicPage', () => {
      it('should find each dilemma of the curated catalog with a public page, in each language, with its content', async () => {
        // Arrange
        const repository = await create();
        const original = argued(curated(1));
        const translation = argued(inEnglish(original));
        await repository.save(original);
        await repository.save(translation);

        // Act
        const found = await repository.findWithPublicPage();

        // Assert
        expect(found.map((dilemma) => dilemma.toSnapshot())).toEqual([
          original.toSnapshot(),
          translation.toSnapshot(),
        ]);
      });

      it('should leave out the dilemmas without a name or reviewed arguments, for adults, private or out of the catalog', async () => {
        // Arrange
        const repository = await create();
        await repository.save(argued(curated(1, 16, false)));
        await repository.save(curated(2));
        await repository.save(argued(curated(3, 18)));
        await repository.save(
          Dilemma.restore({ ...argued(curated(4)).toSnapshot(), visibility: 'private' }),
        );
        await repository.save(inStatus(argued(curated(5)), 'in-exploration'));
        await repository.save(inStatus(argued(curated(6)), 'withdrawn'));

        // Act
        const found = await repository.findWithPublicPage();

        // Assert
        expect(found).toEqual([]);
      });

      it('should leave out the dilemmas that are not from the curated catalog', async () => {
        // Arrange
        const repository = await create();
        await repository.save(argued(dilemma()));

        // Act
        const found = await repository.findWithPublicPage();

        // Assert
        expect(found).toEqual([]);
      });

      it('should leave out a translation without arguments, of an earlier version or of an original out of the catalog', async () => {
        // Arrange
        const repository = await create();
        const first = argued(curated(1));
        await repository.save(first);
        await repository.save(inEnglish(first));
        const second = curated(2);
        const ofTheFirstVersion = argued(inEnglish(second));
        second.revise(
          {
            text: 'TestRevisedText',
            options: second.options.map(({ id, text }) => ({ id, text })),
            category: 'honesty',
            tags: [],
            minimumAge: 16,
          },
          new FixedIdGenerator(),
        );
        await repository.save(argued(second));
        await repository.save(ofTheFirstVersion);
        const third = curated(3);
        await repository.save(inStatus(argued(third), 'withdrawn'));
        await repository.save(argued(inEnglish(third)));

        // Act
        const found = await repository.findWithPublicPage();

        // Assert
        expect(found.map(({ id }) => id)).toEqual(['dlm-1', 'dlm-2']);
      });
    });

    describe('findWithdrawnFromCatalog', () => {
      it('should find the originals of the curated catalog withdrawn from it, and not their translations', async () => {
        // Arrange
        const repository = await create();
        await repository.save(argued(curated(1)));
        const withdrawn = argued(curated(2));
        withdrawn.withdraw();
        const translation = argued(inEnglish(curated(2)));
        translation.withdraw();
        await repository.save(withdrawn);
        await repository.save(translation);
        const seed = argued(dilemma());
        seed.withdraw();
        await repository.save(seed);

        // Act
        const found = await repository.findWithdrawnFromCatalog();

        // Assert
        expect(found.map((dilemma) => dilemma.toSnapshot())).toEqual([withdrawn.toSnapshot()]);
      });

      it('should leave out the withdrawn ones that never could have had a page: without a name or arguments, or for adults', async () => {
        // Arrange
        const repository = await create();
        const unnamed = argued(curated(1, 16, false));
        const withoutArguments = curated(2);
        const forAdults = argued(curated(3, 18));
        for (const never of [unnamed, withoutArguments, forAdults]) {
          never.withdraw();
          await repository.save(never);
        }

        // Act
        const found = await repository.findWithdrawnFromCatalog();

        // Assert
        expect(found).toEqual([]);
      });
    });
  });
}
