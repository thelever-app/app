import { describe, expect, it } from 'vitest';
import { SearchDilemmasUseCase } from '../../use-cases/search-dilemmas.use-case.ts';
import { InvalidLanguageError } from '../../../domain/errors/invalid-language.error.ts';
import { Dilemma } from '../../../domain/entities/dilemma.ts';
import { InMemoryDilemmaRepository } from '../../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';

/** One dilemma for everyone and one for adults, both in honesty and in the catalog. */
async function searchInCatalog() {
  const repository = new InMemoryDilemmaRepository();
  await repository.save(
    Dilemma.create(
      {
        text: 'TestText1',
        language: 'es',
        options: ['TestOptionA', 'TestOptionB'],
        category: 'honesty',
        tags: ['testfamily'],
        minimumAge: 16,
      },
      new FixedIdGenerator('TestDilemma1', 'TestOption1A', 'TestOption1B'),
    ),
  );
  await repository.save(
    Dilemma.create(
      {
        text: 'TestText2',
        language: 'es',
        options: ['TestOptionC', 'TestOptionD'],
        category: 'honesty',
        tags: [],
        minimumAge: 18,
      },
      new FixedIdGenerator('TestDilemma2', 'TestOption2C', 'TestOption2D'),
    ),
  );
  return new SearchDilemmasUseCase(repository);
}

describe('SearchDilemmasUseCase', () => {
  describe('execute', () => {
    it('should return what the lobby shows of each dilemma that matches', async () => {
      // Arrange
      const searchDilemmas = await searchInCatalog();

      // Act
      const { dilemmas } = await searchDilemmas.execute({
        maximumMinimumAge: 18,
        status: 'in-catalog',
        language: 'es',
      });

      // Assert
      expect(dilemmas).toEqual([
        {
          dilemmaId: 'TestDilemma1',
          version: 1,
          text: 'TestText1',
          minimumAge: 16,
          category: 'honesty',
          tags: ['testfamily'],
        },
        {
          dilemmaId: 'TestDilemma2',
          version: 1,
          text: 'TestText2',
          minimumAge: 18,
          category: 'honesty',
          tags: [],
        },
      ]);
    });

    it('should pass every criterion on to the catalog', async () => {
      // Arrange
      const searchDilemmas = await searchInCatalog();

      // Act
      const { dilemmas } = await searchDilemmas.execute({
        dilemmaIds: ['TestDilemma1', 'TestDilemma2'],
        categories: ['honesty'],
        maximumMinimumAge: 16,
        status: 'in-catalog',
        language: 'es',
      });

      // Assert
      expect(dilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual(['TestDilemma1']);
    });

    it('should find only the dilemmas whose text or tags hold what is searched', async () => {
      // Arrange
      const searchDilemmas = await searchInCatalog();

      // Act
      const byText = await searchDilemmas.execute({
        text: 'text2',
        maximumMinimumAge: 18,
        status: 'in-catalog',
        language: 'es',
      });
      const byTag = await searchDilemmas.execute({
        text: 'FAMILY',
        maximumMinimumAge: 18,
        status: 'in-catalog',
        language: 'es',
      });

      // Assert
      expect(byText.dilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual(['TestDilemma2']);
      expect(byTag.dilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual(['TestDilemma1']);
    });

    it('should put first the dilemmas that match best, and the rest by id', async () => {
      // Arrange
      const repository = new InMemoryDilemmaRepository();
      const save = (id: string, text: string, tags: string[]) =>
        repository.save(
          Dilemma.create(
            {
              text,
              language: 'es',
              options: ['TestA', 'TestB'],
              category: 'honesty',
              tags,
              minimumAge: 16,
            },
            new FixedIdGenerator(id, `${id}OptionA`, `${id}OptionB`),
          ),
        );
      await save('TestInside', 'TestElectram', []);
      await save('TestStart', 'Test tramway', []);
      await save('TestTag', 'TestText', ['tram']);
      await save('TestAlsoInside', 'TestMetram', []);

      // Act
      const { dilemmas } = await new SearchDilemmasUseCase(repository).execute({
        text: 'tram',
        maximumMinimumAge: 16,
        status: 'in-catalog',
        language: 'es',
      });

      // Assert
      expect(dilemmas.map(({ dilemmaId }) => dilemmaId)).toEqual([
        'TestTag',
        'TestStart',
        'TestAlsoInside',
        'TestInside',
      ]);
    });

    it('should return the text in the original language while there is no translation', async () => {
      // Arrange
      const searchDilemmas = await searchInCatalog();

      // Act
      const { dilemmas } = await searchDilemmas.execute({
        dilemmaIds: ['TestDilemma1'],
        maximumMinimumAge: 16,
        status: 'in-catalog',
        language: 'en',
      });

      // Assert
      expect(dilemmas[0]?.text).toBe('TestText1');
    });

    it('should throw InvalidLanguageError if the language is not a language code', async () => {
      // Arrange
      const searchDilemmas = await searchInCatalog();

      // Act
      const search = searchDilemmas.execute({
        maximumMinimumAge: 16,
        status: 'in-catalog',
        language: 'Spanish',
      });

      // Assert
      await expect(search).rejects.toThrow(InvalidLanguageError);
    });
  });
});
