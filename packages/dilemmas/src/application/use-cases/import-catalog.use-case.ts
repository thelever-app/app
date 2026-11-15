import { Dilemma } from '../../domain/entities/dilemma.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { ArgumentsSnapshot } from '../../domain/vos/arguments.vo.ts';
import { CatalogImportFailedError } from '../errors/catalog-import-failed.error.ts';
import type {
  CuratedArguments,
  CuratedCatalog,
  CuratedDilemma,
} from '../ports/curated-catalog.port.ts';
import type { DilemmaRepository } from '../ports/dilemma-repository.port.ts';
import type { TranslatableContent, Translator } from '../ports/translator.port.ts';

export interface ImportCatalogOutput {
  /** The approved dilemmas the curated catalog has, changed or not. */
  readonly approved: number;
  /** The originals created or changed. */
  readonly dilemmas: number;
  /** The translations created or changed. */
  readonly translations: number;
  /** The originals withdrawn, with their translations. */
  readonly withdrawn: number;
}

/** Hands out the ids it is given, in order: the catalog fixes them, so loading again finds the same dilemmas. */
class IdsInOrder implements IdGenerator {
  readonly #ids: string[];

  constructor(ids: readonly string[]) {
    this.#ids = [...ids];
  }

  generate(): string {
    const id = this.#ids.shift();
    if (id === undefined) throw new Error('the catalog ran out of ids');
    return id;
  }
}

/** The id of the dilemma with that number of the catalog, or of its translation into a language. */
function idOf(number: number, language?: string): string {
  return language === undefined ? `dlm-${number}` : `dlm-${number}-${language}`;
}

/** The ids of the options from position `from` (from 0) of a dilemma with `count` options. */
function optionIds(dilemmaId: string, from: number, count: number): string[] {
  return Array.from(
    { length: count - from },
    (_, index) => `${dilemmaId}-option-${from + index + 1}`,
  );
}

/** The arguments of the curated catalog on the options of a dilemma, option n arguing option n. */
function argumentsOn(dilemma: Dilemma, curated: CuratedArguments): ArgumentsSnapshot {
  return {
    ...(curated.context !== undefined && { context: curated.context }),
    options: dilemma.options.map(({ id }, index) => {
      const argued = curated.options[index];
      if (!argued) throw new Error(`option ${index + 1} has no arguments`);
      return { optionId: id, for: argued.for, against: argued.against };
    }),
  };
}

function sameArguments(
  a: ArgumentsSnapshot | undefined,
  b: ArgumentsSnapshot | undefined,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Loads the curated catalog into the dilemmas of the app: each approved dilemma is created or
 * revised by the curation team, with its name and its reviewed arguments, and translated into
 * every other language; each discarded one is withdrawn with its translations. Only what changed
 * is saved, and only versions without a translation are translated, so it can run again at any
 * time. A dilemma that fails does not stop the rest; it throws CatalogImportFailedError at the end.
 */
export class ImportCatalogUseCase {
  readonly #catalog: CuratedCatalog;
  readonly #translator: Translator;
  readonly #dilemmaRepository: DilemmaRepository;
  readonly #languages: readonly string[];
  readonly #concurrency: number;

  /**
   * `languages`: every language a dilemma of the catalog is played in, its own included.
   * `concurrency`: how many dilemmas it loads at once, each with its own request to the translator.
   */
  constructor(
    catalog: CuratedCatalog,
    translator: Translator,
    dilemmaRepository: DilemmaRepository,
    languages: readonly string[],
    { concurrency = 1 }: { readonly concurrency?: number } = {},
  ) {
    this.#catalog = catalog;
    this.#translator = translator;
    this.#dilemmaRepository = dilemmaRepository;
    this.#languages = languages;
    this.#concurrency = concurrency;
  }

  async execute(): Promise<ImportCatalogOutput> {
    const { approved, discarded, unreadable } = await this.#catalog.read();
    const failures = [...unreadable];
    const output = { approved: approved.length, dilemmas: 0, translations: 0, withdrawn: 0 };

    const pending: (() => Promise<void>)[] = [
      ...approved.map((curated) => async () => {
        const { changed, translations } = await this.#load(curated);
        if (changed) output.dilemmas += 1;
        output.translations += translations;
      }),
      ...discarded.map((number) => async () => {
        if (await this.#withdraw(number)) output.withdrawn += 1;
      }),
    ];
    const numbers = [...approved.map(({ number }) => number), ...discarded];
    let next = 0;
    const worker = async () => {
      while (next < pending.length) {
        const index = next;
        next += 1;
        try {
          await pending[index]!();
        } catch (error) {
          failures.push({
            number: numbers[index]!,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, this.#concurrency) }, worker));

    if (failures.length > 0) {
      throw new CatalogImportFailedError(failures.toSorted((a, b) => a.number - b.number));
    }
    return output;
  }

  /**
   * The original is saved before its translations when it is new, has a new version or comes back,
   * since they translate that version. A new name or new arguments are given to it only once its
   * translations have them, so a translation that fails is tried again next time.
   */
  async #load(curated: CuratedDilemma): Promise<{ changed: boolean; translations: number }> {
    const id = idOf(curated.number);
    const content = {
      text: curated.text,
      category: curated.category,
      tags: curated.tags,
      minimumAge: curated.minimumAge,
    };

    let original = await this.#dilemmaRepository.findById(id);
    let versioned: boolean;
    if (!original) {
      original = Dilemma.create(
        { ...content, language: curated.language, name: curated.name, options: curated.options },
        new IdsInOrder([id, ...optionIds(id, 0, curated.options.length)]),
      );
      versioned = true;
    } else {
      const version = original.version;
      const status = original.status;
      // Approved again after it was discarded.
      original.reinstate();
      const kept = original.options;
      original.revise(
        {
          ...content,
          // Option n of the catalog is option n of the dilemma, whatever its text.
          options: curated.options.map((text, index) => {
            const option = kept[index];
            return option ? { id: option.id, text } : { text };
          }),
        },
        new IdsInOrder(optionIds(id, kept.length, curated.options.length)),
      );
      versioned = original.version !== version || original.status !== status;
    }
    if (versioned) await this.#dilemmaRepository.save(original);

    const renamed = original.name !== curated.name;
    const args = curated.arguments && argumentsOn(original, curated.arguments);
    const argued = !sameArguments(original.arguments, args);
    const translations = await this.#translate(original, curated, { renamed, argued });

    if (renamed) original.rename(curated.name);
    if (argued) {
      if (args) original.argue(args);
      else original.dropArguments();
    }
    if (renamed || argued) await this.#dilemmaRepository.save(original);
    return { changed: versioned || renamed || argued, translations };
  }

  /**
   * Brings each translation in step with the original: a new translation when it has none of its
   * version, a new name or new arguments when those of the original changed, no arguments when the
   * original has none, and back in the catalog when the original came back. The translator is asked
   * once, only for the languages that need a text.
   */
  async #translate(
    original: Dilemma,
    curated: CuratedDilemma,
    { renamed, argued }: { readonly renamed: boolean; readonly argued: boolean },
  ): Promise<number> {
    const pending: {
      readonly language: string;
      readonly translation: Dilemma | undefined;
      readonly whole: boolean;
      readonly name: boolean;
      readonly args: boolean;
    }[] = [];
    for (const language of this.#languages) {
      if (language === curated.language) continue;
      const translation = await this.#dilemmaRepository.findById(idOf(curated.number, language));
      const whole = translation?.translationOf?.version !== original.version;
      const name = !whole && renamed;
      const args =
        !whole &&
        curated.arguments !== undefined &&
        (argued || translation?.arguments === undefined);
      const dropped = curated.arguments === undefined && translation?.arguments !== undefined;
      const reinstated = translation?.status === 'withdrawn';
      if (whole || name || args || dropped || reinstated) {
        pending.push({ language, translation, whole, name, args });
      }
    }

    const toTranslate = pending
      .filter(({ whole, name, args }) => whole || name || args)
      .map(({ language }) => language);
    const translated =
      toTranslate.length > 0
        ? await this.#translator.translate(
            this.#translatable(curated),
            curated.language,
            toTranslate,
          )
        : new Map<string, TranslatableContent>();

    for (const { language, translation, whole, name, args } of pending) {
      const id = idOf(curated.number, language);
      const content = translated.get(language);
      if ((whole || name || args) && !content) {
        throw new Error(`the translator gave nothing in ${language}`);
      }

      let saved: Dilemma;
      if (!translation) {
        saved = Dilemma.translate(
          original,
          { ...content!, language },
          new IdsInOrder([id, ...optionIds(id, 0, content!.options.length)]),
        );
      } else {
        saved = translation;
        if (whole) {
          saved.retranslate(
            original,
            content!,
            new IdsInOrder(optionIds(id, saved.options.length, content!.options.length)),
          );
        }
        if ((whole || name) && saved.name !== content!.name) saved.rename(content!.name);
        saved.reinstate();
      }

      if (curated.arguments === undefined) {
        saved.dropArguments();
      } else if (whole || args) {
        if (!content?.arguments) throw new Error(`the translator gave no arguments in ${language}`);
        saved.argue(argumentsOn(saved, content.arguments));
      }
      await this.#dilemmaRepository.save(saved);
    }
    return pending.length;
  }

  #translatable(curated: CuratedDilemma): TranslatableContent {
    return {
      name: curated.name,
      text: curated.text,
      options: curated.options,
      tags: curated.tags,
      ...(curated.arguments && { arguments: curated.arguments }),
    };
  }

  /**
   * Whether it withdrew anything: the original and every translation still out of the catalog,
   * also those a withdrawal cut short left there.
   */
  async #withdraw(number: number): Promise<boolean> {
    let withdrawn = false;
    const ids = [idOf(number), ...this.#languages.map((language) => idOf(number, language))];
    for (const id of ids) {
      const dilemma = await this.#dilemmaRepository.findById(id);
      if (!dilemma || dilemma.status === 'withdrawn') continue;
      dilemma.withdraw();
      await this.#dilemmaRepository.save(dilemma);
      withdrawn = true;
    }
    return withdrawn;
  }
}
