import type {
  CuratedCatalog,
  CuratedCatalogContent,
  CuratedDilemma,
  UnreadableDilemma,
} from '../../application/ports/curated-catalog.port.ts';

/** The curated catalog as lists the test keeps changing, as the curation team would in Notion. */
export class InMemoryCuratedCatalog implements CuratedCatalog {
  readonly approved: CuratedDilemma[] = [];
  readonly discarded: number[] = [];
  readonly unreadable: UnreadableDilemma[] = [];

  async read(): Promise<CuratedCatalogContent> {
    return {
      approved: [...this.approved],
      discarded: [...this.discarded],
      unreadable: [...this.unreadable],
    };
  }
}
