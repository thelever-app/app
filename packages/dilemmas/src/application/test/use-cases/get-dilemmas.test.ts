import { describe, expect, it } from 'vitest';
import { GetDilemmasUseCase } from '../../use-cases/get-dilemmas.use-case.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { InvalidLanguageError } from '../../../domain/errors/invalid-language.error.ts';
import { Dilemma } from '../../../domain/entities/dilemma.ts';
import { InMemoryDilemmaRepository } from '../../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';

const CLASSIFICATION = { language: 'es', category: 'honesty', tags: [], minimumAge: 16 };

/** Two dilemmas; the first one is at its second version, whose text is TestRevisedText1. */
async function catalogWithTwoDilemmas() {
  const repository = new InMemoryDilemmaRepository();
  await repository.save(
    Dilemma.create(
      { ...CLASSIFICATION, text: 'TestText1', options: ['TestOptionA', 'TestOptionB'] },
      new FixedIdGenerator('TestDilemma1', 'TestOption1A', 'TestOption1B'),
    ),
  );
  await repository.save(
    Dilemma.create(
      {
        ...CLASSIFICATION,
        text: 'TestText2',
        options: ['TestOptionC', 'TestOptionD', 'TestOptionE'],
      },
      new FixedIdGenerator('TestDilemma2', 'TestOption2C', 'TestOption2D', 'TestOption2E'),
    ),
  );
  const first = await repository.findById('TestDilemma1');
  first?.revise(
    {
      ...CLASSIFICATION,
      text: 'TestRevisedText1',
      options: [
        { id: 'TestOption1A', text: 'TestOptionA' },
        { id: 'TestOption1B', text: 'TestOptionB' },
      ],
    },
    new FixedIdGenerator(),
  );
  if (first) await repository.save(first);
  return new GetDilemmasUseCase(repository);
}

describe('GetDilemmasUseCase', () => {
  describe('execute', () => {
    it('should return the current version of each dilemma, in the order asked for', async () => {
      // Arrange
      const getDilemmas = await catalogWithTwoDilemmas();

      // Act
      const { dilemmas } = await getDilemmas.execute({
        dilemmas: [{ dilemmaId: 'TestDilemma2' }, { dilemmaId: 'TestDilemma1' }],
        language: 'es',
      });

      // Assert
      expect(dilemmas).toEqual([
        {
          dilemmaId: 'TestDilemma2',
          version: 1,
          text: 'TestText2',
          options: [
            { optionId: 'TestOption2C', text: 'TestOptionC' },
            { optionId: 'TestOption2D', text: 'TestOptionD' },
            { optionId: 'TestOption2E', text: 'TestOptionE' },
          ],
        },
        {
          dilemmaId: 'TestDilemma1',
          version: 2,
          text: 'TestRevisedText1',
          options: [
            { optionId: 'TestOption1A', text: 'TestOptionA' },
            { optionId: 'TestOption1B', text: 'TestOptionB' },
          ],
        },
      ]);
    });

    it('should return the version asked for, not the current one', async () => {
      // Arrange
      const getDilemmas = await catalogWithTwoDilemmas();

      // Act
      const { dilemmas } = await getDilemmas.execute({
        dilemmas: [{ dilemmaId: 'TestDilemma1', version: 1 }],
      });

      // Assert
      expect(dilemmas[0]).toMatchObject({ version: 1, text: 'TestText1' });
    });

    it('should throw an error if the version asked for does not exist', async () => {
      // Arrange
      const getDilemmas = await catalogWithTwoDilemmas();

      // Act & Assert
      await expect(
        getDilemmas.execute({ dilemmas: [{ dilemmaId: 'TestDilemma2', version: 2 }] }),
      ).rejects.toThrow(DilemmaNotFoundError);
    });

    it('should return the original text when there is no translation', async () => {
      // Arrange
      const getDilemmas = await catalogWithTwoDilemmas();

      // Act
      const { dilemmas } = await getDilemmas.execute({
        dilemmas: [{ dilemmaId: 'TestDilemma2' }],
        language: 'de',
      });

      // Assert
      expect(dilemmas[0]?.text).toBe('TestText2');
    });

    it('should return the original content when no language is asked for', async () => {
      // Arrange
      const getDilemmas = await catalogWithTwoDilemmas();

      // Act
      const { dilemmas } = await getDilemmas.execute({ dilemmas: [{ dilemmaId: 'TestDilemma2' }] });

      // Assert
      expect(dilemmas[0]?.text).toBe('TestText2');
    });

    it('should tell which dilemma does not exist', async () => {
      // Arrange
      const getDilemmas = await catalogWithTwoDilemmas();

      // Act & Assert
      await expect(
        getDilemmas.execute({ dilemmas: [{ dilemmaId: 'TestUnknownId' }] }),
      ).rejects.toMatchObject({
        dilemmaId: 'TestUnknownId',
      });
    });

    it('should throw an error if a dilemma does not exist', async () => {
      // Arrange
      const getDilemmas = await catalogWithTwoDilemmas();

      // Act & Assert
      await expect(
        getDilemmas.execute({
          dilemmas: [{ dilemmaId: 'TestDilemma1' }, { dilemmaId: 'TestUnknownId' }],
          language: 'es',
        }),
      ).rejects.toThrow(DilemmaNotFoundError);
    });

    it('should throw an error if the language is not a language code', async () => {
      // Arrange
      const getDilemmas = await catalogWithTwoDilemmas();

      // Act & Assert
      await expect(
        getDilemmas.execute({ dilemmas: [{ dilemmaId: 'TestDilemma1' }], language: 'spanish' }),
      ).rejects.toThrow(InvalidLanguageError);
    });
  });
});
