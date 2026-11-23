import { describe, expect, it } from 'vitest';
import { InMemoryDilemmaRepository } from '../../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { SequentialIdGenerator } from '../../../adapters/in-memory/sequential-id-generator.ts';
import { CatalogImportFailedError } from '../../errors/catalog-import-failed.error.ts';
import type {
  CuratedCatalog,
  CuratedDilemma,
  UnreadableDilemma,
} from '../../ports/curated-catalog.port.ts';
import type { TranslatableContent, Translator } from '../../ports/translator.port.ts';
import { ModerateDilemmaUseCase } from '../../use-cases/moderate-dilemma.use-case.ts';
import { ImportCatalogUseCase } from '../../use-cases/import-catalog.use-case.ts';

const LANGUAGES = ['es', 'en', 'fr'];

const CURATED: CuratedDilemma = {
  number: 183,
  language: 'es',
  name: 'TestName',
  text: 'TestText',
  options: ['TestOptionA', 'TestOptionB'],
  category: 'honesty',
  minimumAge: 16,
  tags: ['testtag'],
  type: 'standard',
  compromising: false,
  scale: 'everyday',
  fixedOrder: false,
};

const ARGUMENTS = {
  context: 'TestContext',
  options: [
    { for: 'TestForA', against: 'TestAgainstA' },
    { for: 'TestForB', against: 'TestAgainstB' },
  ],
};

/** A catalog that returns what each test puts in it. */
class StubCatalog implements CuratedCatalog {
  dilemmas: CuratedDilemma[];
  discarded: number[] = [];
  unreadable: UnreadableDilemma[] = [];

  constructor(...dilemmas: CuratedDilemma[]) {
    this.dilemmas = dilemmas;
  }

  async read() {
    return { approved: this.dilemmas, discarded: this.discarded, unreadable: this.unreadable };
  }
}

/** Writes each language in front of every text, and remembers what it was asked. */
class RecordingTranslator implements Translator {
  readonly asked: { readonly text: string; readonly to: readonly string[] }[] = [];
  /** The texts it fails to translate. */
  readonly failing = new Set<string>();

  async translate(content: TranslatableContent, _from: string, to: readonly string[]) {
    this.asked.push({ text: content.text, to });
    if (this.failing.has(content.text)) throw new Error('TestTranslatorError');
    const inLanguage = (language: string, text: string) => `${language}:${text}`;
    return new Map(
      to.map((language) => [
        language,
        {
          name: inLanguage(language, content.name),
          text: inLanguage(language, content.text),
          options: content.options.map((option) => inLanguage(language, option)),
          tags: content.tags.map((tag) => inLanguage(language, tag)),
          ...(content.arguments && {
            arguments: {
              ...(content.arguments.context !== undefined && {
                context: inLanguage(language, content.arguments.context),
              }),
              options: content.arguments.options.map((option) => ({
                for: inLanguage(language, option.for),
                against: inLanguage(language, option.against),
              })),
            },
          }),
        },
      ]),
    );
  }
}

/** Takes a moment to answer, and counts how many requests it had at once. */
class SlowTranslator extends RecordingTranslator {
  #inFlight = 0;
  mostAtOnce = 0;

  override async translate(content: TranslatableContent, from: string, to: readonly string[]) {
    this.#inFlight += 1;
    this.mostAtOnce = Math.max(this.mostAtOnce, this.#inFlight);
    // Lets the other dilemmas reach the translator before it answers.
    for (let turn = 0; turn < 50; turn += 1) await Promise.resolve();
    this.#inFlight -= 1;
    return super.translate(content, from, to);
  }
}

function arrange(...dilemmas: CuratedDilemma[]) {
  const catalog = new StubCatalog(...dilemmas);
  const translator = new RecordingTranslator();
  const repository = new InMemoryDilemmaRepository();
  const importCatalog = new ImportCatalogUseCase(
    catalog,
    translator,
    repository,
    new SequentialIdGenerator('public'),
    LANGUAGES,
  );
  return { catalog, translator, repository, importCatalog };
}

describe('ImportCatalogUseCase', () => {
  describe('execute', () => {
    it('should create an approved dilemma of the curation team, with the number of the catalog in its ids', async () => {
      // Arrange
      const { repository, importCatalog } = arrange(CURATED);

      // Act
      await importCatalog.execute();

      // Assert
      const dilemma = await repository.findById('dlm-183');
      expect(dilemma?.toSnapshot()).toEqual({
        id: 'dlm-183',
        publicId: 'public-1',
        language: 'es',
        name: 'TestName',
        creator: { type: 'curation-team' },
        visibility: 'public',
        version: {
          number: 1,
          text: 'TestText',
          options: [
            { id: 'dlm-183-option-1', text: 'TestOptionA' },
            { id: 'dlm-183-option-2', text: 'TestOptionB' },
          ],
          category: 'honesty',
          tags: ['testtag'],
          minimumAge: 16,
          type: 'standard',
          compromising: false,
          scale: 'everyday',
          fixedOrder: false,
          status: 'in-catalog',
        },
      });
    });

    it('should give the dilemma and its translations the type, whether it is compromising, the scale and the fixed order of the catalog', async () => {
      // Arrange
      const { repository, importCatalog } = arrange({
        ...CURATED,
        type: 'game-theory',
        compromising: true,
        scale: 'extreme',
        fixedOrder: true,
      });

      // Act
      await importCatalog.execute();

      // Assert
      for (const id of ['dlm-183', 'dlm-183-en']) {
        expect((await repository.findById(id))?.toSnapshot().version).toMatchObject({
          type: 'game-theory',
          compromising: true,
          scale: 'extreme',
          fixedOrder: true,
        });
      }
    });

    it('should translate it into every other language, each a dilemma of its own', async () => {
      // Arrange
      const { translator, repository, importCatalog } = arrange(CURATED);

      // Act
      await importCatalog.execute();

      // Assert
      expect(translator.asked).toEqual([{ text: 'TestText', to: ['en', 'fr'] }]);
      const english = await repository.findTranslation({ dilemmaId: 'dlm-183', version: 1 }, 'en');
      expect(english?.id).toBe('dlm-183-en');
      expect(english?.name).toBe('en:TestName');
      expect(english?.text).toBe('en:TestText');
      expect(english?.options).toEqual([
        { id: 'dlm-183-en-option-1', text: 'en:TestOptionA' },
        { id: 'dlm-183-en-option-2', text: 'en:TestOptionB' },
      ]);
      expect(english?.translation).toBe('automatic');
      expect(english?.status).toBe('in-catalog');
      expect((await repository.findById('dlm-183-fr'))?.text).toBe('fr:TestText');
    });

    it('should say how many dilemmas and translations it loaded', async () => {
      // Arrange
      const { importCatalog } = arrange(CURATED, { ...CURATED, number: 184 });

      // Act
      const output = await importCatalog.execute();

      // Assert
      expect(output).toEqual({ approved: 2, dilemmas: 2, translations: 4, withdrawn: 0 });
    });

    it('should change nothing, nor ask the translator, when the catalog is the same', async () => {
      // Arrange
      const { translator, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      const before = (await repository.findById('dlm-183-en'))?.toSnapshot();

      // Act
      const output = await importCatalog.execute();

      // Assert
      expect(translator.asked).toHaveLength(1);
      expect((await repository.findById('dlm-183'))?.version).toBe(1);
      expect((await repository.findById('dlm-183-en'))?.toSnapshot()).toEqual(before);
      expect(output).toEqual({ approved: 1, dilemmas: 0, translations: 0, withdrawn: 0 });
    });

    it('should make a new version of a dilemma whose content changed, and translate it again', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [
        { ...CURATED, text: 'TestRevisedText', options: [...CURATED.options, 'TestOptionC'] },
      ];

      // Act
      await importCatalog.execute();

      // Assert
      const original = await repository.findById('dlm-183');
      expect(original?.version).toBe(2);
      expect(original?.options.map(({ id }) => id)).toEqual([
        'dlm-183-option-1',
        'dlm-183-option-2',
        'dlm-183-option-3',
      ]);
      expect(translator.asked.at(-1)).toEqual({ text: 'TestRevisedText', to: ['en', 'fr'] });
      const english = await repository.findTranslation({ dilemmaId: 'dlm-183', version: 2 }, 'en');
      expect(english?.version).toBe(2);
      expect(english?.text).toBe('en:TestRevisedText');
      expect(english?.options.map(({ id }) => id)).toEqual([
        'dlm-183-en-option-1',
        'dlm-183-en-option-2',
        'dlm-183-en-option-3',
      ]);
    });

    it('should make new versions without asking the translator when only the classification changed', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [
        {
          ...CURATED,
          category: 'loyalty',
          minimumAge: 18,
          type: 'would-you-rather',
          compromising: true,
          scale: 'medium',
          fixedOrder: true,
        },
      ];

      // Act
      const output = await importCatalog.execute();

      // Assert
      expect(translator.asked).toHaveLength(1);
      const english = await repository.findTranslation({ dilemmaId: 'dlm-183', version: 2 }, 'en');
      expect(english?.version).toBe(2);
      expect(english?.text).toBe('en:TestText');
      expect(english?.tags).toEqual(['en:testtag']);
      expect(english?.toSnapshot().version).toMatchObject({
        category: 'loyalty',
        minimumAge: 18,
        type: 'would-you-rather',
        compromising: true,
        scale: 'medium',
        fixedOrder: true,
      });
      expect(output).toEqual({ approved: 1, dilemmas: 1, translations: 2, withdrawn: 0 });
    });

    it('should leave the translations without tags, without asking the translator, when the dilemma is left without them', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [{ ...CURATED, tags: [] }];

      // Act
      await importCatalog.execute();

      // Assert
      expect(translator.asked).toHaveLength(1);
      const english = await repository.findById('dlm-183-en');
      expect(english?.version).toBe(2);
      expect(english?.tags).toEqual([]);
    });

    it('should translate again a dilemma whose tags changed', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [{ ...CURATED, tags: ['testothertag'] }];

      // Act
      await importCatalog.execute();

      // Assert
      expect(translator.asked).toHaveLength(2);
      expect((await repository.findById('dlm-183-en'))?.tags).toEqual(['en:testothertag']);
    });

    it('should keep the arguments of the dilemma and its translations, without asking the translator, when only the classification changed', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange({
        ...CURATED,
        arguments: ARGUMENTS,
      });
      await importCatalog.execute();
      catalog.dilemmas = [{ ...CURATED, arguments: ARGUMENTS, scale: 'extreme' }];

      // Act
      await importCatalog.execute();

      // Assert
      expect(translator.asked).toHaveLength(1);
      expect((await repository.findById('dlm-183'))?.arguments?.context).toBe('TestContext');
      const english = await repository.findById('dlm-183-en');
      expect(english?.version).toBe(2);
      expect(english?.arguments?.context).toBe('en:TestContext');
    });

    it('should rename a dilemma without a new version', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [{ ...CURATED, name: 'TestOtherName' }];

      // Act
      await importCatalog.execute();

      // Assert
      const original = await repository.findById('dlm-183');
      expect(original?.name).toBe('TestOtherName');
      expect(original?.version).toBe(1);
      // Only to rename its translations.
      expect(translator.asked).toHaveLength(2);
    });

    it('should give the original and its translations their arguments, option by option', async () => {
      // Arrange
      const { repository, importCatalog } = arrange({ ...CURATED, arguments: ARGUMENTS });

      // Act
      await importCatalog.execute();

      // Assert
      expect((await repository.findById('dlm-183'))?.arguments).toEqual({
        context: 'TestContext',
        options: [
          { optionId: 'dlm-183-option-1', for: 'TestForA', against: 'TestAgainstA' },
          { optionId: 'dlm-183-option-2', for: 'TestForB', against: 'TestAgainstB' },
        ],
      });
      expect((await repository.findById('dlm-183-en'))?.arguments?.options[0]).toEqual({
        optionId: 'dlm-183-en-option-1',
        for: 'en:TestForA',
        against: 'en:TestAgainstA',
      });
    });

    it('should translate the arguments reviewed after the dilemma was loaded, without new versions', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [{ ...CURATED, arguments: ARGUMENTS }];

      // Act
      await importCatalog.execute();

      // Assert
      expect(translator.asked).toHaveLength(2);
      const english = await repository.findById('dlm-183-en');
      expect(english?.version).toBe(1);
      expect(english?.arguments?.context).toBe('en:TestContext');
    });

    it('should drop the arguments that are no longer reviewed, from the original and its translations', async () => {
      // Arrange
      const { catalog, repository, importCatalog } = arrange({ ...CURATED, arguments: ARGUMENTS });
      await importCatalog.execute();
      catalog.dilemmas = [CURATED];

      // Act
      await importCatalog.execute();

      // Assert
      expect((await repository.findById('dlm-183'))?.arguments).toBeUndefined();
      expect((await repository.findById('dlm-183-en'))?.arguments).toBeUndefined();
    });

    it('should translate again the arguments that changed after they were reviewed', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange({
        ...CURATED,
        arguments: ARGUMENTS,
      });
      await importCatalog.execute();
      catalog.dilemmas = [{ ...CURATED, arguments: { ...ARGUMENTS, context: 'TestOtherContext' } }];

      // Act
      await importCatalog.execute();

      // Assert
      expect(translator.asked).toHaveLength(2);
      expect((await repository.findById('dlm-183-en'))?.arguments?.context).toBe(
        'en:TestOtherContext',
      );
      expect((await repository.findById('dlm-183-en'))?.version).toBe(1);
    });

    it('should rename the translations of a renamed dilemma', async () => {
      // Arrange
      const { catalog, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [{ ...CURATED, name: 'TestOtherName' }];

      // Act
      await importCatalog.execute();

      // Assert
      expect((await repository.findById('dlm-183-en'))?.name).toBe('en:TestOtherName');
      expect((await repository.findById('dlm-183-en'))?.version).toBe(1);
    });

    it('should rename and argue the translations next time when the translator failed to', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [{ ...CURATED, name: 'TestOtherName', arguments: ARGUMENTS }];
      translator.failing.add('TestText');
      await expect(importCatalog.execute()).rejects.toThrow(CatalogImportFailedError);
      translator.failing.clear();

      // Act
      await importCatalog.execute();

      // Assert
      const english = await repository.findById('dlm-183-en');
      expect(english?.name).toBe('en:TestOtherName');
      expect(english?.arguments?.context).toBe('en:TestContext');
      expect((await repository.findById('dlm-183'))?.name).toBe('TestOtherName');
    });

    it('should withdraw the translations a cut withdrawal left in the catalog', async () => {
      // Arrange
      const { catalog, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      const original = await repository.findById('dlm-183');
      original?.withdraw();
      if (original) await repository.save(original);
      catalog.dilemmas = [];
      catalog.discarded = [183];

      // Act
      const output = await importCatalog.execute();

      // Assert
      expect((await repository.findById('dlm-183-fr'))?.status).toBe('withdrawn');
      expect(output.withdrawn).toBe(1);
    });

    it('should bring back to the catalog a discarded dilemma approved again, with its translations', async () => {
      // Arrange
      const { catalog, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [];
      catalog.discarded = [183];
      await importCatalog.execute();
      catalog.dilemmas = [CURATED];
      catalog.discarded = [];

      // Act
      await importCatalog.execute();

      // Assert
      for (const id of ['dlm-183', 'dlm-183-en', 'dlm-183-fr']) {
        expect((await repository.findById(id))?.status).toBe('in-catalog');
      }
      expect((await repository.findById('dlm-183'))?.version).toBe(1);
    });

    it('should never bring back a dilemma Moderation keeps out, even with a new version', async () => {
      // Arrange
      const { catalog, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      const moderate = new ModerateDilemmaUseCase(repository, LANGUAGES);
      await moderate.execute({ dilemmaId: 'dlm-183', action: 'withdraw' });
      await moderate.execute({ dilemmaId: 'dlm-183-en', action: 'hide' });
      catalog.dilemmas = [{ ...CURATED, text: `${CURATED.text} revised` }];

      // Act
      await importCatalog.execute();

      // Assert
      expect((await repository.findById('dlm-183'))?.version).toBe(2);
      for (const id of ['dlm-183', 'dlm-183-en', 'dlm-183-fr']) {
        expect((await repository.findById(id))?.status).toBe('withdrawn');
      }
    });

    it('should withdraw a discarded dilemma and its translations', async () => {
      // Arrange
      const { catalog, repository, importCatalog } = arrange(CURATED);
      await importCatalog.execute();
      catalog.dilemmas = [];
      catalog.discarded = [183];

      // Act
      const output = await importCatalog.execute();

      // Assert
      for (const id of ['dlm-183', 'dlm-183-en', 'dlm-183-fr']) {
        expect((await repository.findById(id))?.status).toBe('withdrawn');
      }
      expect(output.withdrawn).toBe(1);
    });

    it('should leave out a discarded dilemma it never loaded', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange();
      catalog.discarded = [183];

      // Act
      await importCatalog.execute();

      // Assert
      expect(await repository.findById('dlm-183')).toBeUndefined();
      expect(translator.asked).toEqual([]);
    });

    it('should load the rest and then fail, naming the dilemmas it could not read or load', async () => {
      // Arrange
      const { catalog, translator, repository, importCatalog } = arrange(
        { ...CURATED, text: 'TestUntranslatable' },
        { ...CURATED, number: 184 },
      );
      catalog.unreadable = [{ number: 185, reason: 'TestReason' }];
      translator.failing.add('TestUntranslatable');

      // Act
      const run = importCatalog.execute();

      // Assert
      await expect(run).rejects.toThrow(CatalogImportFailedError);
      await expect(run).rejects.toMatchObject({
        failures: [
          { number: 183, reason: 'TestTranslatorError' },
          { number: 185, reason: 'TestReason' },
        ],
      });
      expect((await repository.findById('dlm-184-en'))?.text).toBe('en:TestText');
    });

    it('should translate several dilemmas at once, never more than asked, and still load each one', async () => {
      // Arrange
      const catalog = new StubCatalog(
        ...Array.from({ length: 10 }, (_, index) => ({ ...CURATED, number: index + 1 })),
      );
      const repository = new InMemoryDilemmaRepository();
      const translator = new SlowTranslator();
      const importCatalog = new ImportCatalogUseCase(
        catalog,
        translator,
        repository,
        new SequentialIdGenerator('public'),
        LANGUAGES,
        {
          concurrency: 4,
        },
      );

      // Act
      const output = await importCatalog.execute();

      // Assert
      expect(translator.mostAtOnce).toBe(4);
      expect(output).toEqual({ approved: 10, dilemmas: 10, translations: 20, withdrawn: 0 });
      expect((await repository.findById('dlm-10-fr'))?.text).toBe('fr:TestText');
    });

    it('should keep a dilemma whose translations failed, so the next run translates only them', async () => {
      // Arrange
      const { translator, repository, importCatalog } = arrange({
        ...CURATED,
        text: 'TestUntranslatable',
      });
      translator.failing.add('TestUntranslatable');
      await expect(importCatalog.execute()).rejects.toThrow(CatalogImportFailedError);
      translator.failing.clear();

      // Act
      await importCatalog.execute();

      // Assert
      expect((await repository.findById('dlm-183'))?.version).toBe(1);
      expect((await repository.findById('dlm-183-en'))?.text).toBe('en:TestUntranslatable');
    });
  });
});
