import { describe, expect, it } from 'vitest';
import { NotionCuratedCatalog } from '../../../jobs/catalog-import/notion-curated-catalog.ts';

const TOKEN = 'TestToken';
const DATA_SOURCE_ID = 'TestDataSourceId';

function richText(content: string) {
  return { type: 'rich_text', rich_text: content ? [{ plain_text: content }] : [] };
}

/** A row of the Catalog of dilemmas as the API of Notion returns it; what is not given, an approved dilemma. */
function row(facts: Record<string, unknown> = {}) {
  const value = <T>(name: string, fallback: T) => (name in facts ? facts[name] : fallback) as T;
  return {
    object: 'page',
    id: `page-${value('number', 183)}`,
    properties: {
      ID: { type: 'unique_id', unique_id: { prefix: 'DLM', number: value('number', 183) } },
      Estado: { type: 'status', status: { name: value('status', 'Aprobado') } },
      Dilema: { type: 'title', title: [{ plain_text: value('name', 'El olor') }] },
      Pregunta: richText(value('text', 'Si {alguien del grupo} huele mal, ¿qué haces?')),
      'Opción 1': richText(value('option1', 'Se lo digo yo')),
      'Opción 2': richText(value('option2', 'No me meto')),
      'Opción 3': richText(value('option3', '')),
      'Opción 4': richText(value('option4', '')),
      Categoría: { type: 'select', select: { name: value('category', 'honesty') } },
      'Edad mínima': { type: 'select', select: value('minimumAge', { name: '16' }) },
      Etiquetas: { type: 'multi_select', multi_select: value('tags', [{ name: 'clásico' }]) },
      Argumentos: richText(value('arguments', '')),
      'Argumentos revisados': { type: 'checkbox', checkbox: value('reviewed', false) },
      Tipo: { type: 'select', select: value('type', { name: 'standard' }) },
      Comprometido: { type: 'checkbox', checkbox: value('compromising', false) },
      Escala: { type: 'select', select: value('scale', { name: 'everyday' }) },
      'Orden fijo': { type: 'checkbox', checkbox: value('fixedOrder', false) },
    },
  };
}

/** Answers the queries of the data source with these pages, one page per response, and keeps the requests. */
function notionWith(...pages: ReturnType<typeof row>[][]) {
  const requests: { url: string; init: RequestInit }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} });
    const index = requests.length - 1;
    const results = pages[index] ?? [];
    const more = index < pages.length - 1;
    return new Response(
      JSON.stringify({ results, has_more: more, next_cursor: more ? `cursor-${index + 1}` : null }),
      { status: 200 },
    );
  };
  return {
    requests,
    catalog: new NotionCuratedCatalog({ token: TOKEN, dataSourceId: DATA_SOURCE_ID, fetch }),
  };
}

describe('NotionCuratedCatalog', () => {
  describe('read', () => {
    it('should read an approved dilemma in Spanish, with the gap as Dilemmas keeps it', async () => {
      // Arrange
      const { catalog } = notionWith([row()]);

      // Act
      const { approved, discarded, unreadable } = await catalog.read();

      // Assert
      expect(unreadable).toEqual([]);
      expect(discarded).toEqual([]);
      expect(approved).toEqual([
        {
          number: 183,
          language: 'es',
          name: 'El olor',
          text: 'Si {gap} huele mal, ¿qué haces?',
          options: ['Se lo digo yo', 'No me meto'],
          category: 'honesty',
          minimumAge: 16,
          tags: ['clásico'],
          type: 'standard',
          compromising: false,
          scale: 'everyday',
          fixedOrder: false,
        },
      ]);
    });

    it('should read the type, whether it is compromising, the scale and the fixed order', async () => {
      // Arrange
      const { catalog } = notionWith([
        row({
          type: { name: 'game-theory' },
          compromising: true,
          scale: { name: 'extreme' },
          fixedOrder: true,
        }),
      ]);

      // Act
      const { approved } = await catalog.read();

      // Assert
      expect(approved[0]).toMatchObject({
        type: 'game-theory',
        compromising: true,
        scale: 'extreme',
        fixedOrder: true,
      });
    });

    it('should ask only for the approved and discarded dilemmas, with the token and the version of the API', async () => {
      // Arrange
      const { requests, catalog } = notionWith([]);

      // Act
      await catalog.read();

      // Assert
      const [request] = requests;
      expect(request?.url).toBe('https://api.notion.com/v1/data_sources/TestDataSourceId/query');
      expect(request?.init.method).toBe('POST');
      expect(new Headers(request?.init.headers).get('authorization')).toBe('Bearer TestToken');
      expect(new Headers(request?.init.headers).get('notion-version')).toBe('2025-09-03');
      expect(JSON.parse(String(request?.init.body)).filter).toEqual({
        or: [
          { property: 'Estado', status: { equals: 'Aprobado' } },
          { property: 'Estado', status: { equals: 'Descartado' } },
        ],
      });
    });

    it('should read every page of results', async () => {
      // Arrange
      const { requests, catalog } = notionWith([row()], [row({ number: 184 })]);

      // Act
      const { approved } = await catalog.read();

      // Assert
      expect(approved.map(({ number }) => number)).toEqual([183, 184]);
      expect(JSON.parse(String(requests[1]?.init.body)).start_cursor).toBe('cursor-1');
    });

    it('should read only the number of a discarded dilemma, however incomplete it is', async () => {
      // Arrange
      const { catalog } = notionWith([row({ status: 'Descartado', minimumAge: null, text: '' })]);

      // Act
      const { approved, discarded, unreadable } = await catalog.read();

      // Assert
      expect(discarded).toEqual([183]);
      expect(approved).toEqual([]);
      expect(unreadable).toEqual([]);
    });

    it('should read up to four options, skipping the empty ones', async () => {
      // Arrange
      const { catalog } = notionWith([row({ option3: 'Tercera', option4: '' })]);

      // Act
      const { approved } = await catalog.read();

      // Assert
      expect(approved[0]?.options).toEqual(['Se lo digo yo', 'No me meto', 'Tercera']);
    });

    it('should put apart a dilemma with an empty option before a written one, which would move the options', async () => {
      // Arrange
      const { catalog } = notionWith([row({ option2: '', option3: 'Tercera' })]);

      // Act
      const { approved, unreadable } = await catalog.read();

      // Assert
      expect(approved).toEqual([]);
      expect(unreadable[0]?.reason).toContain('Opción 2');
    });

    it('should read the arguments only when they are reviewed', async () => {
      // Arrange
      const text =
        'Se lo digo yo\nA favor: F1.\nEn contra: C1.\n\nNo me meto\nA favor: F2.\nEn contra: C2.';
      const { catalog } = notionWith([
        row({ arguments: text, reviewed: true }),
        row({ number: 184, arguments: text, reviewed: false }),
      ]);

      // Act
      const { approved } = await catalog.read();

      // Assert
      expect(approved[0]?.arguments).toEqual({
        options: [
          { for: 'F1.', against: 'C1.' },
          { for: 'F2.', against: 'C2.' },
        ],
      });
      expect(approved[1]).not.toHaveProperty('arguments');
    });

    it('should put apart, with the reason, a dilemma it cannot read, and read the rest', async () => {
      // Arrange
      const { catalog } = notionWith([
        row({ minimumAge: null }),
        row({ number: 184, arguments: 'Otra cosa\nA favor: F.\nEn contra: C.', reviewed: true }),
        row({ number: 185 }),
        row({ number: 186, type: null }),
        row({ number: 187, scale: { name: 'extremo' } }),
      ]);

      // Act
      const { approved, unreadable } = await catalog.read();

      // Assert
      expect(approved.map(({ number }) => number)).toEqual([185]);
      expect(unreadable.map(({ number }) => number)).toEqual([183, 184, 186, 187]);
      expect(unreadable[1]?.reason).toContain('Otra cosa');
      expect(unreadable[2]?.reason).toContain('Tipo');
      expect(unreadable[3]?.reason).toContain('Escala');
    });

    it('should throw an error when Notion refuses the query', async () => {
      // Arrange
      const fetch = async () => new Response('{"code":"unauthorized"}', { status: 401 });
      const catalog = new NotionCuratedCatalog({
        token: TOKEN,
        dataSourceId: DATA_SOURCE_ID,
        fetch,
      });

      // Act & Assert
      await expect(catalog.read()).rejects.toThrow('401');
    });
  });
});
