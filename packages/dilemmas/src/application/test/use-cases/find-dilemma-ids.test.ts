import { describe, expect, it } from 'vitest';
import { FindDilemmaIdsUseCase } from '../../use-cases/find-dilemma-ids.use-case.ts';
import { InvalidLanguageError } from '../../../domain/errors/invalid-language.error.ts';
import { Dilemma } from '../../../domain/entities/dilemma.ts';
import { InMemoryDilemmaRepository } from '../../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';

/** A dilemma of honesty for everyone, one of honesty for adults and one of loyalty. */
async function findInCatalog() {
  const repository = new InMemoryDilemmaRepository();
  for (const [id, category, minimumAge] of [
    ['TestHonesty', 'honesty', 16],
    ['TestHonestyForAdults', 'honesty', 18],
    ['TestLoyalty', 'loyalty', 16],
  ] as const) {
    await repository.save(
      Dilemma.create(
        {
          text: `TextOf${id}`,
          language: 'es',
          options: ['A', 'B'],
          category,
          tags: [],
          minimumAge,
        },
        new FixedIdGenerator(id, `${id}OptionA`, `${id}OptionB`),
      ),
    );
  }
  return new FindDilemmaIdsUseCase(repository);
}

describe('FindDilemmaIdsUseCase', () => {
  describe('execute', () => {
    it('should give only the ids of every dilemma that matches', async () => {
      // Arrange
      const findDilemmaIds = await findInCatalog();

      // Act
      const { dilemmaIds } = await findDilemmaIds.execute({
        categories: ['honesty'],
        maximumMinimumAge: 16,
        status: 'in-catalog',
        language: 'es',
      });

      // Assert
      expect(dilemmaIds).toEqual(['TestHonesty']);
    });

    it('should find nothing in a category that does not exist', async () => {
      // Arrange
      const findDilemmaIds = await findInCatalog();

      // Act
      const { dilemmaIds } = await findDilemmaIds.execute({
        categories: ['TestNoCategory'],
        maximumMinimumAge: 16,
        status: 'in-catalog',
        language: 'es',
      });

      // Assert
      expect(dilemmaIds).toEqual([]);
    });

    it('should throw InvalidLanguageError if the language is not a language code', async () => {
      // Arrange
      const findDilemmaIds = await findInCatalog();

      // Act
      const find = findDilemmaIds.execute({
        maximumMinimumAge: 16,
        status: 'in-catalog',
        language: 'Spanish',
      });

      // Assert
      await expect(find).rejects.toThrow(InvalidLanguageError);
    });
  });
});
