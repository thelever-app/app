import { describe, expect, it } from 'vitest';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { GetDilemmaPreviewUseCase } from '../../use-cases/get-dilemma-preview.use-case.ts';
import { InMemoryDilemmaRepository } from '../../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { Dilemma } from '../../../domain/entities/dilemma.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';

function trolley(): Dilemma {
  return Dilemma.create(
    {
      text: 'TestText',
      language: 'en',
      name: 'TestName',
      options: ['TestOptionA', 'TestOptionB'],
      category: 'life-and-death',
      tags: [],
      minimumAge: 16,
    },
    new FixedIdGenerator('dlm-7', 'dlm-7-option-1', 'dlm-7-option-2', 'TestPublicId'),
  );
}

async function previewOf(dilemma: Dilemma): Promise<GetDilemmaPreviewUseCase> {
  const repository = new InMemoryDilemmaRepository();
  await repository.save(dilemma);
  return new GetDilemmaPreviewUseCase(repository);
}

describe('GetDilemmaPreviewUseCase', () => {
  describe('execute', () => {
    it('should tell what a room needs to start with the dilemma of that public id', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(trolley());

      // Act
      const preview = await getDilemmaPreview.execute({ publicId: 'TestPublicId' });

      // Assert
      expect(preview).toEqual({
        dilemmaId: 'dlm-7',
        name: 'TestName',
        category: 'life-and-death',
        optionCount: 2,
        minimumAge: 16,
        language: 'en',
      });
    });

    it('should throw DilemmaNotFoundError if no dilemma has that public id', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(trolley());

      // Act & Assert
      await expect(getDilemmaPreview.execute({ publicId: 'dlm-7' })).rejects.toThrow(
        DilemmaNotFoundError,
      );
    });

    it('should throw DilemmaNotFoundError if the dilemma cannot be read', async () => {
      // Arrange
      const withdrawn = trolley();
      withdrawn.withdraw();
      const getDilemmaPreview = await previewOf(withdrawn);

      // Act & Assert
      await expect(getDilemmaPreview.execute({ publicId: 'TestPublicId' })).rejects.toThrow(
        DilemmaNotFoundError,
      );
    });
  });
});
