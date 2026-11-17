import { describe, expect, it } from 'vitest';
import { GetPublicCatalogUseCase } from '../../use-cases/get-public-catalog.use-case.ts';
import { InMemoryDilemmaRepository } from '../../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { Dilemma } from '../../../domain/entities/dilemma.ts';
import type { MinimumAge } from '../../../domain/vos/minimum-age.vo.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';

/** A dilemma of the curated catalog with that number, in Spanish, named and in the catalog. */
function curated(number: number, minimumAge: MinimumAge = 16): Dilemma {
  const id = `dlm-${number}`;
  return Dilemma.create(
    {
      text: `TestText${number}`,
      language: 'es',
      name: `TestName${number}`,
      options: ['TestOptionA', 'TestOptionB'],
      category: 'honesty',
      tags: ['testtag'],
      minimumAge,
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    },
    new FixedIdGenerator(id, `${id}-option-1`, `${id}-option-2`, `${id}-public`),
  );
}

/** Its English translation, as the import makes it. */
function inEnglish(original: Dilemma): Dilemma {
  const id = `${original.id}-en`;
  return Dilemma.translate(
    original,
    {
      language: 'en',
      name: `${original.name}En`,
      text: `${original.text}En`,
      options: ['TestOptionAEn', 'TestOptionBEn'],
      tags: [],
    },
    new FixedIdGenerator(id, `${id}-option-1`, `${id}-option-2`, `${id}-public`),
  );
}

function argued(dilemma: Dilemma): Dilemma {
  dilemma.argue({
    context: 'TestContext',
    options: dilemma.options.map(({ id }) => ({
      optionId: id,
      for: `TestFor${id}`,
      against: `TestAgainst${id}`,
    })),
  });
  return dilemma;
}

async function catalogWith(...dilemmas: Dilemma[]): Promise<GetPublicCatalogUseCase> {
  const repository = new InMemoryDilemmaRepository();
  for (const dilemma of dilemmas) await repository.save(dilemma);
  return new GetPublicCatalogUseCase(repository);
}

describe('GetPublicCatalogUseCase', () => {
  describe('execute', () => {
    it('should return a dilemma of the general catalog in each language it can be read in', async () => {
      // Arrange
      const original = argued(curated(1));
      const getPublicCatalog = await catalogWith(original, argued(inEnglish(original)));

      // Act
      const { dilemmas } = await getPublicCatalog.execute();

      // Assert
      expect(dilemmas).toEqual([
        expect.objectContaining({
          number: 1,
          dilemmaId: 'dlm-1-en',
          language: 'en',
          name: 'TestName1En',
        }),
        {
          number: 1,
          dilemmaId: 'dlm-1',
          publicId: 'dlm-1-public',
          language: 'es',
          name: 'TestName1',
          text: 'TestText1',
          options: [
            { optionId: 'dlm-1-option-1', text: 'TestOptionA' },
            { optionId: 'dlm-1-option-2', text: 'TestOptionB' },
          ],
          category: 'honesty',
          arguments: {
            context: 'TestContext',
            options: [
              {
                optionId: 'dlm-1-option-1',
                for: 'TestFordlm-1-option-1',
                against: 'TestAgainstdlm-1-option-1',
              },
              {
                optionId: 'dlm-1-option-2',
                for: 'TestFordlm-1-option-2',
                against: 'TestAgainstdlm-1-option-2',
              },
            ],
          },
        },
      ]);
    });

    it('should return the number and the category of the dilemmas withdrawn from the catalog, and no page of them', async () => {
      // Arrange
      const withdrawn = argued(curated(2));
      withdrawn.withdraw();
      const translation = argued(inEnglish(curated(2)));
      translation.withdraw();
      const getPublicCatalog = await catalogWith(argued(curated(1)), withdrawn, translation);

      // Act
      const output = await getPublicCatalog.execute();

      // Assert
      expect(output.dilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual(['dlm-1']);
      expect(output.withdrawn).toEqual([{ number: 2, category: 'honesty' }]);
    });
  });
});
