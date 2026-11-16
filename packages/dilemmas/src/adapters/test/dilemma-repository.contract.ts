import { describe, expect, it } from 'vitest';
import type { DilemmaRepository } from '../../application/ports/dilemma-repository.port.ts';
import { Dilemma } from '../../domain/entities/dilemma.ts';
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

    describe('findPublicCatalog', () => {
      it('should find the public dilemmas in the catalog or withdrawn, at their current version, with their content', async () => {
        // Arrange
        const repository = await create();
        const argued = revised();
        argued.argue({
          options: argued.options.map(({ id }) => ({
            optionId: id,
            for: `TestFor${id}`,
            against: `TestAgainst${id}`,
          })),
        });
        await repository.save(dilemma());
        await repository.save(argued);
        const withdrawn = translation();
        withdrawn.withdraw();
        await repository.save(withdrawn);

        // Act
        const found = await repository.findPublicCatalog();

        // Assert
        expect(found.map((dilemma) => dilemma.toSnapshot())).toEqual([
          argued.toSnapshot(),
          withdrawn.toSnapshot(),
        ]);
      });

      it('should leave out the private dilemmas and those whose current version is elsewhere', async () => {
        // Arrange
        const repository = await create();
        const { version, ...rest } = dilemma().toSnapshot();
        await repository.save(Dilemma.restore({ ...rest, visibility: 'private', version }));
        await repository.save(
          Dilemma.restore({
            ...translation().toSnapshot(),
            version: { ...translation().toSnapshot().version, status: 'in-exploration' },
          }),
        );

        // Act
        const found = await repository.findPublicCatalog();

        // Assert
        expect(found).toEqual([]);
      });
    });
  });
}
