import { describe, expect, it } from 'vitest';
import { DilemmaNotFoundError } from '../../application/errors/dilemma-not-found.error.ts';
import type {
  CatalogDilemma,
  DilemmaCatalog,
  DilemmaContent,
  DilemmaSearch,
} from '../../application/ports/dilemma-catalog.port.ts';

/**
 * The public dilemmas every implementation stores before each test: their ids are its own. The
 * first one is for everyone, the second one for adults and the third one is in exploration.
 */
export const CONTRACT_DILEMMAS = [
  {
    text: 'TestText1',
    options: ['TestOptionA', 'TestOptionB'],
    category: 'honesty',
    tags: ['testfamily'],
    minimumAge: 16,
    status: 'in-catalog',
  },
  {
    text: 'TestText2',
    options: ['TestOptionC', 'TestOptionD', 'TestOptionE'],
    category: 'loyalty',
    tags: [],
    minimumAge: 18,
    status: 'in-catalog',
  },
  {
    text: 'TestText3',
    options: ['TestOptionF', 'TestOptionG'],
    category: 'honesty',
    tags: [],
    minimumAge: 16,
    status: 'in-exploration',
  },
] as const;

/** What a search finds of the contract dilemma at that position (from 0), with its id as stored. */
function foundAt(stored: readonly DilemmaContent[], position: 0 | 1 | 2): CatalogDilemma {
  const { text, category, tags, minimumAge } = CONTRACT_DILEMMAS[position];
  const dilemmaId = stored[position]?.dilemmaId;
  if (!dilemmaId) throw new Error(`The catalog stored no dilemma at position ${position}`);
  return { dilemmaId, text, category, tags, minimumAge };
}

const FOR_EVERYONE: DilemmaSearch = {
  maximumMinimumAge: 16,
  status: 'in-catalog',
  language: 'es',
};

/** The order of what a search returns is not part of the contract. */
function byText(found: readonly CatalogDilemma[]): CatalogDilemma[] {
  return [...found].sort((first, second) => first.text.localeCompare(second.text));
}

/**
 * What every DilemmaCatalog must do, in memory or backed by the Dilemmas context (ADR 0001).
 * `create` stores CONTRACT_DILEMMAS, each at its first version, and returns the catalog with their content as stored.
 */
export function describeDilemmaCatalogContract(
  name: string,
  create: () => Promise<{ catalog: DilemmaCatalog; stored: readonly DilemmaContent[] }>,
): void {
  describe(`${name} (DilemmaCatalog contract)`, () => {
    describe('findOptionIds', () => {
      it('should return the current version and the ids of the options of each dilemma, in the order asked for', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first, second] = stored as [DilemmaContent, DilemmaContent];

        // Act
        const dilemmas = await catalog.findOptionIds([second.dilemmaId, first.dilemmaId]);

        // Assert
        expect(dilemmas).toEqual([
          {
            dilemmaId: second.dilemmaId,
            version: 1,
            optionIds: second.options.map(({ optionId }) => optionId),
          },
          {
            dilemmaId: first.dilemmaId,
            version: 1,
            optionIds: first.options.map(({ optionId }) => optionId),
          },
        ]);
      });

      it('should throw an error if a dilemma does not exist', async () => {
        // Arrange
        const { catalog } = await create();

        // Act & Assert
        await expect(catalog.findOptionIds(['TestUnknownId'])).rejects.toThrow(
          DilemmaNotFoundError,
        );
      });
    });

    describe('findContents', () => {
      it('should return the text and the options of each version asked for, in the order asked for', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first, second] = stored as [DilemmaContent, DilemmaContent];

        // Act
        const contents = await catalog.findContents(
          [
            { dilemmaId: second.dilemmaId, version: 1 },
            { dilemmaId: first.dilemmaId, version: 1 },
          ],
          'es',
        );

        // Assert
        expect(contents).toEqual([second, first]);
        expect(contents.map(({ text }) => text)).toEqual(['TestText2', 'TestText1']);
        expect(first.options.map(({ text }) => text)).toEqual(['TestOptionA', 'TestOptionB']);
      });

      it('should throw an error if a dilemma does not exist', async () => {
        // Arrange
        const { catalog } = await create();

        // Act & Assert
        await expect(
          catalog.findContents([{ dilemmaId: 'TestUnknownId', version: 1 }], 'es'),
        ).rejects.toThrow(DilemmaNotFoundError);
      });

      it('should throw an error if the version of a dilemma does not exist', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first] = stored as [DilemmaContent];

        // Act & Assert
        await expect(
          catalog.findContents([{ dilemmaId: first.dilemmaId, version: 2 }], 'es'),
        ).rejects.toThrow(DilemmaNotFoundError);
      });
    });

    describe('search', () => {
      it('should find the dilemmas of the catalog for everyone, with what the lobby shows', async () => {
        // Arrange
        const { catalog, stored } = await create();

        // Act
        const found = await catalog.search(FOR_EVERYONE);

        // Assert
        expect(found).toEqual([foundAt(stored, 0)]);
      });

      it('should find the dilemmas for adults too when the room allows them', async () => {
        // Arrange
        const { catalog, stored } = await create();

        // Act
        const found = await catalog.search({ ...FOR_EVERYONE, maximumMinimumAge: 18 });

        // Assert
        expect(byText(found)).toEqual([foundAt(stored, 0), foundAt(stored, 1)]);
      });

      it('should find the dilemmas in exploration when asked for them', async () => {
        // Arrange
        const { catalog, stored } = await create();

        // Act
        const found = await catalog.search({ ...FOR_EVERYONE, status: 'in-exploration' });

        // Assert
        expect(found).toEqual([foundAt(stored, 2)]);
      });

      it('should hold every criterion given', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const forAdults = { ...FOR_EVERYONE, maximumMinimumAge: 18 } as const;
        const second = foundAt(stored, 1);

        // Act
        const byCategory = await catalog.search({
          ...forAdults,
          categories: ['loyalty', 'justice'],
        });
        const byText = await catalog.search({ ...forAdults, text: 'text2' });
        const byTag = await catalog.search({ ...forAdults, text: 'FAMILY' });
        const byId = await catalog.search({ ...forAdults, dilemmaIds: [second.dilemmaId] });

        // Assert
        expect(byCategory).toEqual([second]);
        expect(byText).toEqual([second]);
        expect(byTag).toEqual([foundAt(stored, 0)]);
        expect(byId).toEqual([second]);
      });

      it('should find the dilemmas of every category when none is given', async () => {
        // Arrange
        const { catalog, stored } = await create();

        // Act
        const found = await catalog.search({
          ...FOR_EVERYONE,
          maximumMinimumAge: 18,
          categories: [],
        });

        // Assert
        expect(byText(found)).toEqual([foundAt(stored, 0), foundAt(stored, 1)]);
      });

      it('should return an empty list when nothing matches', async () => {
        // Arrange
        const { catalog } = await create();

        // Act
        const found = await catalog.search({ ...FOR_EVERYONE, dilemmaIds: ['TestUnknownId'] });

        // Assert
        expect(found).toEqual([]);
      });
    });
  });
}
