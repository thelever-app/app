import { describe, expect, it } from 'vitest';
import { DilemmaNotFoundError } from '../../application/errors/dilemma-not-found.error.ts';
import { InvalidPageError } from '../../application/errors/invalid-page.error.ts';
import {
  GAP_MARKER,
  type CatalogDilemma,
  type DilemmaCatalog,
  type DilemmaContent,
  type DilemmaSearch,
} from '../../application/ports/dilemma-catalog.port.ts';

/**
 * The public dilemmas every implementation stores before each test, in Spanish: their ids are its
 * own. The first one is for everyone, with a translation into English; the second one for adults,
 * with the gap, a game theory one, extreme and with a fixed order; the third one is in
 * exploration, a would-you-rather one; and the fourth one is compromising.
 */
export const CONTRACT_DILEMMAS = [
  {
    text: 'TestText1',
    options: ['TestOptionA', 'TestOptionB'],
    category: 'honesty',
    tags: ['testfamily'],
    minimumAge: 16,
    compromising: false,
    type: 'standard',
    scale: 'everyday',
    fixedOrder: false,
    status: 'in-catalog',
    translations: [
      {
        language: 'en',
        text: 'TestTranslatedText1',
        options: ['TestTranslatedOptionA', 'TestTranslatedOptionB'],
      },
    ],
  },
  {
    text: `TestText2 about ${GAP_MARKER}`,
    options: ['TestOptionC', 'TestOptionD', 'TestOptionE'],
    category: 'loyalty',
    tags: [],
    minimumAge: 18,
    compromising: false,
    type: 'game-theory',
    scale: 'extreme',
    fixedOrder: true,
    status: 'in-catalog',
    translations: [],
  },
  {
    text: 'TestText3',
    options: ['TestOptionF', 'TestOptionG'],
    category: 'honesty',
    tags: [],
    minimumAge: 16,
    compromising: false,
    type: 'would-you-rather',
    scale: 'medium',
    fixedOrder: false,
    status: 'in-exploration',
    translations: [],
  },
  {
    text: 'TestText4',
    options: ['TestOptionH', 'TestOptionI'],
    category: 'love-and-relationships',
    tags: [],
    minimumAge: 16,
    compromising: true,
    type: 'standard',
    scale: 'everyday',
    fixedOrder: false,
    status: 'in-catalog',
    translations: [],
  },
] as const;

/** What a search finds of the contract dilemma at that position (from 0), with its id as stored. */
function foundAt(stored: readonly DilemmaContent[], position: 0 | 1 | 2 | 3): CatalogDilemma {
  const { text, category, tags, minimumAge, options, compromising, type, scale } =
    CONTRACT_DILEMMAS[position];
  const dilemmaId = stored[position]?.dilemmaId;
  if (!dilemmaId) throw new Error(`The catalog stored no dilemma at position ${position}`);
  return {
    dilemmaId,
    text,
    category,
    tags,
    minimumAge,
    optionCount: options.length,
    compromising,
    type,
    scale,
    hasGap: text.includes(GAP_MARKER),
  };
}

/** Big enough for every search of the contract to fit in one page. */
const ALL = { size: 100 };

const FOR_EVERYONE: DilemmaSearch = {
  maximumMinimumAge: 16,
  status: 'in-catalog',
  language: 'es',
  includeCompromising: false,
};

/** A draw that leaves nothing out: more than the contract stores, none played or excluded. */
const A_GAME = {
  count: 100,
  includeGap: true,
  excludedIds: [],
  content: { age: 'any', compromising: 'any' },
  playedBy: [],
} as const;

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
      it('should return the current version, the ids of the options, whether it has the gap and whether its order is fixed, of each dilemma in the order asked for', async () => {
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
            hasGap: true,
            fixedOrder: true,
          },
          {
            dilemmaId: first.dilemmaId,
            version: 1,
            optionIds: first.options.map(({ optionId }) => optionId),
            hasGap: false,
            fixedOrder: false,
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
        expect(contents.map(({ text }) => text)).toEqual([CONTRACT_DILEMMAS[1].text, 'TestText1']);
        expect(first.options.map(({ text }) => text)).toEqual(['TestOptionA', 'TestOptionB']);
      });

      it('should say the language of what it returns', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first] = stored as [DilemmaContent];

        // Act
        const [content] = await catalog.findContents(
          [{ dilemmaId: first.dilemmaId, version: 1 }],
          'es',
        );

        // Assert
        expect(content?.language).toBe('es');
      });

      it('should return the translation into the language asked for, with the ids of the options played', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first] = stored as [DilemmaContent];

        // Act
        const [content] = await catalog.findContents(
          [{ dilemmaId: first.dilemmaId, version: 1 }],
          'en',
        );

        // Assert
        expect(content).toEqual({
          dilemmaId: first.dilemmaId,
          text: 'TestTranslatedText1',
          options: [
            { optionId: first.options[0]?.optionId, text: 'TestTranslatedOptionA' },
            { optionId: first.options[1]?.optionId, text: 'TestTranslatedOptionB' },
          ],
          category: CONTRACT_DILEMMAS[0].category,
          language: 'en',
        });
      });

      it('should return the dilemma played, in its language, when there is no translation into the one asked for', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first, second] = stored as [DilemmaContent, DilemmaContent];

        // Act
        const contents = await catalog.findContents(
          [
            { dilemmaId: first.dilemmaId, version: 1 },
            { dilemmaId: second.dilemmaId, version: 1 },
          ],
          'de',
        );

        // Assert
        expect(contents).toEqual([first, second]);
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
        const found = (await catalog.search(FOR_EVERYONE, ALL)).dilemmas;

        // Assert
        expect(found).toEqual([foundAt(stored, 0)]);
      });

      it('should find the dilemmas for adults too when the room allows them', async () => {
        // Arrange
        const { catalog, stored } = await create();

        // Act
        const found = (await catalog.search({ ...FOR_EVERYONE, maximumMinimumAge: 18 }, ALL))
          .dilemmas;

        // Assert
        expect(byText(found)).toEqual([foundAt(stored, 0), foundAt(stored, 1)]);
      });

      it('should find the compromising dilemmas only when they are included', async () => {
        // Arrange
        const { catalog, stored } = await create();

        // Act
        const found = (await catalog.search({ ...FOR_EVERYONE, includeCompromising: true }, ALL))
          .dilemmas;

        // Assert
        expect(byText(found)).toEqual([foundAt(stored, 0), foundAt(stored, 3)]);
      });

      it('should find the dilemmas in exploration when asked for them', async () => {
        // Arrange
        const { catalog, stored } = await create();

        // Act
        const found = (await catalog.search({ ...FOR_EVERYONE, status: 'in-exploration' }, ALL))
          .dilemmas;

        // Assert
        expect(found).toEqual([foundAt(stored, 2)]);
      });

      it('should hold every criterion given', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const forAdults = { ...FOR_EVERYONE, maximumMinimumAge: 18 } as const;
        const second = foundAt(stored, 1);

        // Act
        const byCategory = (
          await catalog.search(
            {
              ...forAdults,
              categories: ['loyalty', 'justice'],
            },
            ALL,
          )
        ).dilemmas;
        const byText = (await catalog.search({ ...forAdults, text: 'text2' }, ALL)).dilemmas;
        const byTag = (await catalog.search({ ...forAdults, text: 'FAMILY' }, ALL)).dilemmas;
        const byId = (await catalog.search({ ...forAdults, dilemmaIds: [second.dilemmaId] }, ALL))
          .dilemmas;

        // Assert
        expect(byCategory).toEqual([second]);
        expect(byText).toEqual([second]);
        expect(byTag).toEqual([foundAt(stored, 0)]);
        expect(byId).toEqual([second]);
      });

      it('should find the dilemmas of every category when no category is given', async () => {
        // Arrange
        const { catalog, stored } = await create();

        // Act
        const found = (await catalog.search({ ...FOR_EVERYONE, maximumMinimumAge: 18 }, ALL))
          .dilemmas;

        // Assert
        expect(byText(found)).toEqual([foundAt(stored, 0), foundAt(stored, 1)]);
      });

      it('should find nothing for an empty list of categories', async () => {
        // Arrange
        const { catalog } = await create();

        // Act
        const found = (await catalog.search({ ...FOR_EVERYONE, categories: [] }, ALL)).dilemmas;

        // Assert
        expect(found).toEqual([]);
      });

      it('should find only the dilemmas in the language given', async () => {
        // Arrange
        const { catalog } = await create();

        // Act
        const found = (await catalog.search({ ...FOR_EVERYONE, language: 'fr' }, ALL)).dilemmas;

        // Assert
        expect(found).toEqual([]);
      });

      it('should give a page as big as asked for, and the next one after it', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const forAdults = { ...FOR_EVERYONE, maximumMinimumAge: 18 } as const;

        // Act
        const first = await catalog.search(forAdults, { size: 1 });
        const second = await catalog.search(forAdults, { size: 1, after: first.next! });

        // Assert
        expect(byText([...first.dilemmas, ...second.dilemmas])).toEqual([
          foundAt(stored, 0),
          foundAt(stored, 1),
        ]);
        expect(second.next).toBeUndefined();
      });

      it('should throw InvalidPageError for a page that does not come from a search', async () => {
        // Arrange
        const { catalog } = await create();

        // Act & Assert
        await expect(catalog.search(FOR_EVERYONE, { size: 1, after: 'made up' })).rejects.toThrow(
          InvalidPageError,
        );
      });

      it('should return an empty list when nothing matches', async () => {
        // Arrange
        const { catalog } = await create();

        // Act
        const found = (
          await catalog.search({ ...FOR_EVERYONE, dilemmaIds: ['TestUnknownId'] }, ALL)
        ).dilemmas;

        // Assert
        expect(found).toEqual([]);
      });
    });

    describe('findCandidates', () => {
      it('should give every dilemma that matches', async () => {
        // Arrange
        const { catalog, stored } = await create();

        const idsOf = async (criteria: DilemmaSearch) =>
          (await catalog.findCandidates({ ...A_GAME, ...criteria })).map(
            ({ dilemmaId }) => dilemmaId,
          );

        // Act
        const forEveryone = await idsOf(FOR_EVERYONE);
        const forAdults = await idsOf({
          ...FOR_EVERYONE,
          maximumMinimumAge: 18,
        });
        const inExploration = await idsOf({
          ...FOR_EVERYONE,
          status: 'in-exploration',
        });
        const ofLoyalty = await idsOf({
          ...FOR_EVERYONE,
          maximumMinimumAge: 18,
          categories: ['loyalty'],
        });
        const inFrench = await idsOf({ ...FOR_EVERYONE, language: 'fr' });
        const withCompromising = await idsOf({
          ...FOR_EVERYONE,
          includeCompromising: true,
        });

        // Assert
        const [first, second, third, fourth] = stored.map(({ dilemmaId }) => dilemmaId);
        expect(forEveryone).toEqual([first]);
        expect([...withCompromising].sort()).toEqual([first, fourth].sort());
        expect([...forAdults].sort()).toEqual([first, second].sort());
        expect(inExploration).toEqual([third]);
        expect(ofLoyalty).toEqual([second]);
        expect(inFrench).toEqual([]);
      });

      it('should classify each dilemma it gives', async () => {
        // Arrange
        const { catalog, stored } = await create();

        // Act
        const found = await catalog.findCandidates({
          ...FOR_EVERYONE,
          ...A_GAME,
          maximumMinimumAge: 18,
        });

        // Assert
        expect([...found].sort((one, other) => one.minimumAge - other.minimumAge)).toEqual([
          {
            dilemmaId: stored[0]?.dilemmaId,
            type: 'standard',
            scale: 'everyday',
            minimumAge: 16,
            hasGap: false,
          },
          {
            dilemmaId: stored[1]?.dilemmaId,
            type: 'game-theory',
            scale: 'extreme',
            minimumAge: 18,
            hasGap: true,
          },
        ]);
      });

      it('should draw no more than asked for, those played by fewer players first', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first, second] = stored.map(({ dilemmaId }) => dilemmaId);
        const forAdults = { ...FOR_EVERYONE, ...A_GAME, maximumMinimumAge: 18 } as const;

        // Act
        const one = await catalog.findCandidates({ ...forAdults, count: 1 });
        const fewest = await catalog.findCandidates({
          ...forAdults,
          count: 1,
          playedBy: [
            { dilemmaId: first!, players: 2 },
            { dilemmaId: second!, players: 1 },
          ],
        });

        // Assert
        expect(one).toHaveLength(1);
        expect(fewest.map(({ dilemmaId }) => dilemmaId)).toEqual([second]);
      });

      it('should draw only the dilemmas for adults when asked for those', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const second = stored[1]?.dilemmaId;

        // Act
        const found = await catalog.findCandidates({
          ...FOR_EVERYONE,
          ...A_GAME,
          maximumMinimumAge: 18,
          content: { age: 'adults-only', compromising: 'any' },
        });

        // Assert
        expect(found.map(({ dilemmaId }) => dilemmaId)).toEqual([second]);
      });

      it('should draw only the compromising dilemmas when asked for those', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const fourth = stored[3]?.dilemmaId;

        // Act
        const found = await catalog.findCandidates({
          ...FOR_EVERYONE,
          ...A_GAME,
          includeCompromising: true,
          content: { age: 'any', compromising: 'yes' },
        });

        // Assert
        expect(found.map(({ dilemmaId }) => dilemmaId)).toEqual([fourth]);
      });

      it('should draw only the dilemmas from 16 that are not compromising when asked for those', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const first = stored[0]?.dilemmaId;

        // Act
        const found = await catalog.findCandidates({
          ...FOR_EVERYONE,
          ...A_GAME,
          maximumMinimumAge: 18,
          includeCompromising: true,
          content: { age: 'from-16', compromising: 'no' },
        });

        // Assert
        expect(found.map(({ dilemmaId }) => dilemmaId)).toEqual([first]);
      });

      it('should leave out the dilemmas excluded, and those with the gap unless they are included', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first, second] = stored.map(({ dilemmaId }) => dilemmaId);
        const forAdults = { ...FOR_EVERYONE, ...A_GAME, maximumMinimumAge: 18 } as const;

        // Act
        const notExcluded = await catalog.findCandidates({ ...forAdults, excludedIds: [first!] });
        const withoutGap = await catalog.findCandidates({ ...forAdults, includeGap: false });

        // Assert
        expect(notExcluded.map(({ dilemmaId }) => dilemmaId)).toEqual([second]);
        expect(withoutGap.map(({ dilemmaId }) => dilemmaId)).toEqual([first]);
      });
    });
  });
}
