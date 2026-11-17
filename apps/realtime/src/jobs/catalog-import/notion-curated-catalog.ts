import {
  CATEGORIES,
  type CuratedCatalog,
  type CuratedCatalogContent,
  type CuratedDilemma,
  DILEMMA_TYPES,
  MINIMUM_AGES,
  SCALES,
  type UnreadableDilemma,
} from '@thelever-app/dilemmas';
import { GAP_MARKER } from '@thelever-app/dilemmas/published';
import { z } from 'zod';
import { parseArguments } from './curated-arguments.ts';

const NOTION_API = 'https://api.notion.com/v1';
/** The version of the API of Notion that has data sources. */
const NOTION_VERSION = '2025-09-03';
/** How the curation team writes the gap "someone in the group" in the Catalog of dilemmas. */
const NOTION_GAP = '{alguien del grupo}';
/** The language the curation team writes the catalog in. */
const LANGUAGE = 'es';

const plainText = z.array(z.object({ plain_text: z.string() })).transform((parts) =>
  parts
    .map(({ plain_text }) => plain_text)
    .join('')
    .trim(),
);
const richText = z.object({ rich_text: plainText });

/** What every row has: its number and whether it is approved or discarded. */
const RowState = z.object({
  properties: z.object({
    ID: z.object({ unique_id: z.object({ number: z.number().int() }) }),
    Estado: z.object({ status: z.object({ name: z.enum(['Aprobado', 'Descartado']) }) }),
  }),
});

/** The properties of an approved row of the Catalog of dilemmas that the app loads; the rest are ignored. */
const Row = z.object({
  properties: z.object({
    ID: z.object({ unique_id: z.object({ number: z.number().int() }) }),
    Dilema: z.object({ title: plainText }),
    Pregunta: richText,
    'Opción 1': richText,
    'Opción 2': richText,
    'Opción 3': richText,
    'Opción 4': richText,
    Categoría: z.object({ select: z.object({ name: z.enum(CATEGORIES) }) }),
    'Edad mínima': z.object({
      select: z.object({ name: z.enum(MINIMUM_AGES.map(String) as [string, ...string[]]) }),
    }),
    Etiquetas: z.object({ multi_select: z.array(z.object({ name: z.string() })) }),
    Argumentos: richText,
    'Argumentos revisados': z.object({ checkbox: z.boolean() }),
    Tipo: z.object({ select: z.object({ name: z.enum(DILEMMA_TYPES) }) }),
    Comprometido: z.object({ checkbox: z.boolean() }),
    Escala: z.object({ select: z.object({ name: z.enum(SCALES) }) }),
    'Orden fijo': z.object({ checkbox: z.boolean() }),
  }),
});

const QueryResponse = z.object({
  results: z.array(z.unknown()),
  has_more: z.boolean(),
  next_cursor: z.string().nullable(),
});

/** Only the number of a row, to name the one that cannot be read. */
const RowNumber = z.object({
  properties: z.object({ ID: z.object({ unique_id: z.object({ number: z.number() }) }) }),
});

const OPTION_FIELDS = ['Opción 1', 'Opción 2', 'Opción 3', 'Opción 4'] as const;

function withGap(text: string): string {
  return text.replaceAll(NOTION_GAP, GAP_MARKER);
}

function dilemmaOf(row: z.infer<typeof Row>): CuratedDilemma {
  const p = row.properties;
  const written = OPTION_FIELDS.map((field) => withGap(p[field].rich_text));
  // Option n is option n of the dilemma: an empty one before a written one would move the rest.
  const empty = written.indexOf('');
  if (empty !== -1 && written.slice(empty).some((option) => option.length > 0)) {
    throw new Error(`${OPTION_FIELDS[empty]} is empty but a later option is not`);
  }
  const options = written.filter((option) => option.length > 0);
  const reviewed = p['Argumentos revisados'].checkbox && p.Argumentos.rich_text.length > 0;
  return {
    number: p.ID.unique_id.number,
    language: LANGUAGE,
    name: p.Dilema.title,
    text: withGap(p.Pregunta.rich_text),
    options,
    category: p.Categoría.select.name,
    minimumAge: Number(p['Edad mínima'].select.name) as CuratedDilemma['minimumAge'],
    tags: p.Etiquetas.multi_select.map(({ name }) => name),
    type: p.Tipo.select.name,
    compromising: p.Comprometido.checkbox,
    scale: p.Escala.select.name,
    fixedOrder: p['Orden fijo'].checkbox,
    ...(reviewed && { arguments: parseArguments(withGap(p.Argumentos.rich_text), options) }),
  };
}

/**
 * The curated catalog as the curation team keeps it in the Catalog of dilemmas of Notion, read
 * with an internal integration that can only read it. A row that cannot be read is put apart with
 * the reason, so the rest still loads.
 */
export class NotionCuratedCatalog implements CuratedCatalog {
  readonly #token: string;
  readonly #dataSourceId: string;
  readonly #fetch: typeof fetch;

  constructor({
    token,
    dataSourceId,
    fetch: fetchImplementation = fetch,
  }: {
    readonly token: string;
    readonly dataSourceId: string;
    readonly fetch?: (url: string, init: RequestInit) => Promise<Response>;
  }) {
    this.#token = token;
    this.#dataSourceId = dataSourceId;
    this.#fetch = fetchImplementation as typeof fetch;
  }

  /** Of a discarded row only its number is read: nothing else of it is loaded. */
  async read(): Promise<CuratedCatalogContent> {
    const approved: CuratedDilemma[] = [];
    const discarded: number[] = [];
    const unreadable: UnreadableDilemma[] = [];
    let cursor: string | null = null;
    do {
      const page = await this.#query(cursor);
      for (const result of page.results) {
        try {
          const state = RowState.parse(result).properties;
          if (state.Estado.status.name === 'Descartado') discarded.push(state.ID.unique_id.number);
          else approved.push(dilemmaOf(Row.parse(result)));
        } catch (error) {
          const number = RowNumber.safeParse(result).data?.properties.ID.unique_id.number ?? 0;
          unreadable.push({ number, reason: reasonOf(error) });
        }
      }
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    return { approved, discarded, unreadable };
  }

  async #query(cursor: string | null): Promise<z.infer<typeof QueryResponse>> {
    const response = await this.#fetch(`${NOTION_API}/data_sources/${this.#dataSourceId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
        filter: {
          or: [
            { property: 'Estado', status: { equals: 'Aprobado' } },
            { property: 'Estado', status: { equals: 'Descartado' } },
          ],
        },
        ...(cursor && { start_cursor: cursor }),
      }),
    });
    if (!response.ok) {
      throw new Error(`Notion answered ${response.status}: ${await response.text()}`);
    }
    return QueryResponse.parse(await response.json());
  }
}

function reasonOf(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; ');
  }
  return error instanceof Error ? error.message : String(error);
}
