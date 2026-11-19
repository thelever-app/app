import { describe, expect, it } from 'vitest';
import type {
  CandidateSearch,
  CatalogPage,
  DilemmaCatalog,
  DilemmaContent,
  DilemmaSearch,
} from '../../../application/ports/dilemma-catalog.port.ts';
import type { GameDilemma } from '../../../domain/entities/game.ts';
import type { CandidateDilemma } from '../../../domain/vos/classification.vo.ts';
import { InMemoryDilemmaCatalog } from '../../in-memory/in-memory-dilemma-catalog.ts';
import {
  CONTRACT_DILEMMAS,
  describeDilemmaCatalogContract,
} from '../../test/dilemma-catalog.contract.ts';
import { CachedDilemmaCatalog } from '../cached-dilemma-catalog.ts';

describeDilemmaCatalogContract('CachedDilemmaCatalog', async () => {
  const dilemmas = CONTRACT_DILEMMAS.map(({ text, options, ...facts }, index) => ({
    ...facts,
    dilemmaId: `TestDilemma${index + 1}`,
    text,
    options: options.map((option, optionIndex) => ({
      optionId: `TestDilemma${index + 1}Option${optionIndex + 1}`,
      text: option,
    })),
  }));
  const stored = dilemmas.map(({ dilemmaId, text, options }) => ({
    dilemmaId,
    text,
    options,
    language: 'es',
  }));
  return { catalog: new CachedDilemmaCatalog(new InMemoryDilemmaCatalog(dilemmas)), stored };
});

/** A catalog that answers every version it is asked for and remembers what it was asked. */
class CountingCatalog implements DilemmaCatalog {
  readonly asked: string[][] = [];
  /** The dilemmas without a translation, which it returns in Spanish whatever the language asked for. */
  readonly untranslated = new Set<string>();

  async findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]> {
    this.asked.push(['options', ...dilemmaIds]);
    return dilemmaIds.map((dilemmaId) => ({
      dilemmaId,
      version: 1,
      optionIds: [],
      hasGap: false,
      fixedOrder: false,
    }));
  }

  async findContents(
    dilemmas: readonly { readonly dilemmaId: string; readonly version: number }[],
    language: string,
  ): Promise<readonly DilemmaContent[]> {
    this.asked.push(
      dilemmas.map(({ dilemmaId, version }) => `${dilemmaId}@${version}:${language}`),
    );
    return dilemmas.map(({ dilemmaId, version }) => ({
      dilemmaId,
      text: `TestText ${dilemmaId}@${version} ${language}`,
      options: [],
      language: this.untranslated.has(dilemmaId) ? 'es' : language,
    }));
  }

  async findCandidates(criteria: CandidateSearch): Promise<readonly CandidateDilemma[]> {
    this.asked.push(['candidates', criteria.status]);
    return [];
  }

  async search(criteria: DilemmaSearch): Promise<CatalogPage> {
    this.asked.push(['search', criteria.status]);
    return { dilemmas: [] };
  }
}

describe('CachedDilemmaCatalog', () => {
  it('should ask once for the content of a version in a language', async () => {
    // Arrange
    const inner = new CountingCatalog();
    const catalog = new CachedDilemmaCatalog(inner);
    const played = [{ dilemmaId: 'TestA', version: 1 }];

    // Act
    const first = await catalog.findContents(played, 'es');
    const second = await catalog.findContents(played, 'es');

    // Assert
    expect(second).toEqual(first);
    expect(inner.asked).toEqual([['TestA@1:es']]);
  });

  it('should ask only for what it has not got, and keep the order asked for', async () => {
    // Arrange
    const inner = new CountingCatalog();
    const catalog = new CachedDilemmaCatalog(inner);
    await catalog.findContents([{ dilemmaId: 'TestB', version: 1 }], 'es');

    // Act
    const found = await catalog.findContents(
      [
        { dilemmaId: 'TestA', version: 1 },
        { dilemmaId: 'TestB', version: 1 },
        { dilemmaId: 'TestB', version: 2 },
      ],
      'es',
    );

    // Assert
    expect(found.map(({ text }) => text)).toEqual([
      'TestText TestA@1 es',
      'TestText TestB@1 es',
      'TestText TestB@2 es',
    ]);
    expect(inner.asked.at(-1)).toEqual(['TestA@1:es', 'TestB@2:es']);
  });

  it('should keep each language apart', async () => {
    // Arrange
    const inner = new CountingCatalog();
    const catalog = new CachedDilemmaCatalog(inner);
    await catalog.findContents([{ dilemmaId: 'TestA', version: 1 }], 'es');

    // Act
    const [found] = await catalog.findContents([{ dilemmaId: 'TestA', version: 1 }], 'en');

    // Assert
    expect(found?.text).toBe('TestText TestA@1 en');
  });

  it('should ask again for what came in another language, since its translation may still come', async () => {
    // Arrange
    const inner = new CountingCatalog();
    inner.untranslated.add('TestA');
    const catalog = new CachedDilemmaCatalog(inner);
    const played = [{ dilemmaId: 'TestA', version: 1 }];
    await catalog.findContents(played, 'en');
    inner.untranslated.delete('TestA');

    // Act
    const [content] = await catalog.findContents(played, 'en');
    await catalog.findContents(played, 'en');

    // Assert
    expect(content?.language).toBe('en');
    expect(inner.asked).toEqual([['TestA@1:en'], ['TestA@1:en']]);
  });

  it('should always ask for the current versions, which change', async () => {
    // Arrange
    const inner = new CountingCatalog();
    const catalog = new CachedDilemmaCatalog(inner);

    // Act
    await catalog.findOptionIds(['TestA']);
    await catalog.findOptionIds(['TestA']);

    // Assert
    expect(inner.asked).toEqual([
      ['options', 'TestA'],
      ['options', 'TestA'],
    ]);
  });

  it('should return what it was asked for even when it is full', async () => {
    // Arrange: full, with TestA the first kept.
    const inner = new CountingCatalog();
    const catalog = new CachedDilemmaCatalog(inner, { maxContents: 2 });
    await catalog.findContents([{ dilemmaId: 'TestA', version: 1 }], 'es');
    await catalog.findContents([{ dilemmaId: 'TestB', version: 1 }], 'es');

    // Act
    const found = await catalog.findContents(
      [
        { dilemmaId: 'TestA', version: 1 },
        { dilemmaId: 'TestC', version: 1 },
      ],
      'es',
    );

    // Assert
    expect(found.map(({ text }) => text)).toEqual(['TestText TestA@1 es', 'TestText TestC@1 es']);
  });

  it('should let go first of what it was asked for least recently', async () => {
    // Arrange: TestA kept first, but asked for again after TestB.
    const inner = new CountingCatalog();
    const catalog = new CachedDilemmaCatalog(inner, { maxContents: 2 });
    await catalog.findContents([{ dilemmaId: 'TestA', version: 1 }], 'es');
    await catalog.findContents([{ dilemmaId: 'TestB', version: 1 }], 'es');
    await catalog.findContents([{ dilemmaId: 'TestA', version: 1 }], 'es');

    // Act
    await catalog.findContents([{ dilemmaId: 'TestC', version: 1 }], 'es');
    await catalog.findContents([{ dilemmaId: 'TestA', version: 1 }], 'es');

    // Assert: TestA was still kept, TestB went.
    expect(inner.asked).toEqual([['TestA@1:es'], ['TestB@1:es'], ['TestC@1:es']]);
  });

  describe('search and findCandidates', () => {
    it('should always ask the catalog, since current versions change', async () => {
      // Arrange
      const counting = new CountingCatalog();
      const catalog = new CachedDilemmaCatalog(counting);
      const criteria = {
        maximumMinimumAge: 16,
        status: 'in-catalog',
        language: 'es',
        includeCompromising: false,
      } as const;

      // Act
      await catalog.search(criteria, { size: 20 });
      await catalog.search(criteria, { size: 20 });
      const draw = {
        ...criteria,
        count: 3,
        includeGap: true,
        excludedIds: [],
        content: 'any' as const,
        playedBy: [],
      };
      await catalog.findCandidates(draw);
      await catalog.findCandidates(draw);

      // Assert
      expect(counting.asked).toEqual([
        ['search', 'in-catalog'],
        ['search', 'in-catalog'],
        ['candidates', 'in-catalog'],
        ['candidates', 'in-catalog'],
      ]);
    });
  });
});
