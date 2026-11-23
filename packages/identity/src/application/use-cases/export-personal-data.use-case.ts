import type { PersonalDataStore } from '../ports/personal-data-store.port.ts';

/**
 * Everything the personal data stores keep of an identity, one section each, as the file a
 * player downloads; the stores that keep nothing of it are left out.
 */
export class ExportPersonalDataUseCase {
  readonly #stores: readonly PersonalDataStore[];

  constructor(stores: readonly PersonalDataStore[]) {
    this.#stores = stores;
  }

  async execute(identity: string): Promise<Record<string, unknown>> {
    const sections: Record<string, unknown> = {};
    for (const store of this.#stores) {
      const data = await store.export(identity);
      if (data !== undefined) sections[store.section] = data;
    }
    return sections;
  }
}
