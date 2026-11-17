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
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
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

    it.each([
      ['withdrawn', (dilemma: Dilemma) => dilemma.withdraw()],
      [
        'in exploration',
        (dilemma: Dilemma) =>
          Dilemma.restore({
            ...dilemma.toSnapshot(),
            version: { ...dilemma.toSnapshot().version, status: 'in-exploration' },
          }),
      ],
      [
        'private',
        (dilemma: Dilemma) => Dilemma.restore({ ...dilemma.toSnapshot(), visibility: 'private' }),
      ],
      [
        'for adults',
        (dilemma: Dilemma) =>
          Dilemma.restore({
            ...dilemma.toSnapshot(),
            version: { ...dilemma.toSnapshot().version, minimumAge: 18 },
          }),
      ],
    ] as const)(
      'should throw DilemmaNotFoundError if the dilemma is %s: no new room may start with it',
      async (_case, change) => {
        // Arrange
        const dilemma = trolley();
        const changed = change(dilemma) ?? dilemma;
        const getDilemmaPreview = await previewOf(changed);

        // Act & Assert
        await expect(getDilemmaPreview.execute({ publicId: 'TestPublicId' })).rejects.toThrow(
          DilemmaNotFoundError,
        );
      },
    );
  });
});
