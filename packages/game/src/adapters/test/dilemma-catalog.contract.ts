import { describe, expect, it } from 'vitest';
import { DilemmaNotFoundError } from '../../application/errors/dilemma-not-found.error.ts';
import type {
  DilemmaCatalog,
  DilemmaContent,
} from '../../application/ports/dilemma-catalog.port.ts';

/** Two dilemmas every implementation stores before each test: their ids are its own. */
export const CONTRACT_DILEMMAS = [
  { text: 'TestText1', options: ['TestOptionA', 'TestOptionB'] },
  { text: 'TestText2', options: ['TestOptionC', 'TestOptionD', 'TestOptionE'] },
] as const;

/**
 * What every DilemmaCatalog must do, in memory or backed by the Dilemmas context (ADR 0001).
 * `create` stores CONTRACT_DILEMMAS and returns the catalog with their content as stored.
 */
export function describeDilemmaCatalogContract(
  name: string,
  create: () => Promise<{ catalog: DilemmaCatalog; stored: readonly DilemmaContent[] }>,
): void {
  describe(`${name} (DilemmaCatalog contract)`, () => {
    describe('findOptionIds', () => {
      it('should return the ids of the options of each dilemma, in the order asked for', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first, second] = stored as [DilemmaContent, DilemmaContent];

        // Act
        const dilemmas = await catalog.findOptionIds([second.dilemmaId, first.dilemmaId]);

        // Assert
        expect(dilemmas).toEqual([
          {
            dilemmaId: second.dilemmaId,
            optionIds: second.options.map(({ optionId }) => optionId),
          },
          { dilemmaId: first.dilemmaId, optionIds: first.options.map(({ optionId }) => optionId) },
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
      it('should return the text and the options of each dilemma, in the order asked for', async () => {
        // Arrange
        const { catalog, stored } = await create();
        const [first, second] = stored as [DilemmaContent, DilemmaContent];

        // Act
        const contents = await catalog.findContents([second.dilemmaId, first.dilemmaId], 'es');

        // Assert
        expect(contents).toEqual([second, first]);
        expect(contents.map(({ text }) => text)).toEqual(['TestText2', 'TestText1']);
        expect(first.options.map(({ text }) => text)).toEqual(['TestOptionA', 'TestOptionB']);
      });

      it('should throw an error if a dilemma does not exist', async () => {
        // Arrange
        const { catalog } = await create();

        // Act & Assert
        await expect(catalog.findContents(['TestUnknownId'], 'es')).rejects.toThrow(
          DilemmaNotFoundError,
        );
      });
    });
  });
}
