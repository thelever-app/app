import { describe, expect, it } from 'vitest';
import { FindCandidatesUseCase } from '../../use-cases/find-candidates.use-case.ts';
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
          type: id === 'TestHonesty' ? 'game-theory' : 'standard',
          compromising: false,
          scale: id === 'TestHonesty' ? 'extreme' : 'everyday',
          fixedOrder: false,
        },
        new FixedIdGenerator(id, `${id}OptionA`, `${id}OptionB`, `${id}-public`),
      ),
    );
  }
  return new FindCandidatesUseCase(repository);
}

/** A draw that leaves nothing out of the test data. */
const A_GAME = {
  count: 10,
  includeGap: true,
  excludedIds: [],
  content: { age: 'any', compromising: 'any' },
  playedBy: [],
} as const;

describe('FindCandidatesUseCase', () => {
  describe('execute', () => {
    it('should give every dilemma that matches, with its id and its classification', async () => {
      // Arrange
      const findCandidates = await findInCatalog();

      // Act
      const { candidates } = await findCandidates.execute({
        categories: ['honesty'],
        maximumMinimumAge: 16,
        status: 'in-catalog',
        includeCompromising: false,
        language: 'es',
        ...A_GAME,
      });

      // Assert
      expect(candidates).toEqual([
        {
          dilemmaId: 'TestHonesty',
          type: 'game-theory',
          scale: 'extreme',
          minimumAge: 16,
          hasGap: false,
        },
      ]);
    });

    it('should draw at most as many as asked for', async () => {
      // Arrange
      const findCandidates = await findInCatalog();

      // Act
      const { candidates } = await findCandidates.execute({
        maximumMinimumAge: 18,
        status: 'in-catalog',
        includeCompromising: false,
        language: 'es',
        ...A_GAME,
        count: 2,
      });

      // Assert
      expect(candidates).toHaveLength(2);
    });

    it('should throw InvalidLanguageError if the language is not a language code', async () => {
      // Arrange
      const findCandidates = await findInCatalog();

      // Act
      const find = findCandidates.execute({
        maximumMinimumAge: 16,
        status: 'in-catalog',
        includeCompromising: false,
        language: 'Spanish',
        ...A_GAME,
      });

      // Assert
      await expect(find).rejects.toThrow(InvalidLanguageError);
    });
  });
});
