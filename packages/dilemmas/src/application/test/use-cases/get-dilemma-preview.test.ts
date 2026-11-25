import { describe, expect, it } from 'vitest';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { DilemmaOnlyForAdultsError } from '../../errors/dilemma-only-for-adults.error.ts';
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

/** The trolley, for adults only, or also compromising. */
function forAdults(compromising = false): Dilemma {
  const snapshot = trolley().toSnapshot();
  return Dilemma.restore({
    ...snapshot,
    version: { ...snapshot.version, minimumAge: 18, compromising },
  });
}

async function previewOf(dilemma: Dilemma): Promise<GetDilemmaPreviewUseCase> {
  const repository = new InMemoryDilemmaRepository();
  await repository.save(dilemma);
  return new GetDilemmaPreviewUseCase(repository);
}

describe('GetDilemmaPreviewUseCase', () => {
  describe('execute', () => {
    it('should tell the version of the original its votes alone count for, also from a translation', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(trolley());

      // Act
      const { version } = await getDilemmaPreview.execute({ publicId: 'TestPublicId' });

      // Assert
      expect(version).toBe(trolley().translationOf?.version ?? trolley().version);
    });

    it('should give the text and the options in the language of the link, to vote it alone', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(trolley());

      // Act
      const { text, options } = await getDilemmaPreview.execute({ publicId: 'TestPublicId' });

      // Assert
      expect(text).toBe(trolley().text);
      expect(options).toEqual(trolley().options.map(({ id, text }) => ({ optionId: id, text })));
    });

    it('should tell what a room needs to start with the dilemma of that public id', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(trolley());

      // Act
      const preview = await getDilemmaPreview.execute({ publicId: 'TestPublicId' });

      // Assert
      expect(preview).toEqual(
        expect.objectContaining({
          dilemmaId: 'dlm-7',
          name: 'TestName',
          category: 'life-and-death',
          optionCount: 2,
          minimumAge: 16,
          language: 'en',
        }),
      );
    });

    it('should throw DilemmaNotFoundError if no dilemma has that public id', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(trolley());

      // Act & Assert
      await expect(getDilemmaPreview.execute({ publicId: 'dlm-7' })).rejects.toThrow(
        DilemmaNotFoundError,
      );
    });

    const UNOPENABLE = [
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
        'compromising',
        (dilemma: Dilemma) =>
          Dilemma.restore({
            ...dilemma.toSnapshot(),
            version: { ...dilemma.toSnapshot().version, compromising: true },
          }),
      ],
    ] as const;

    it.each(UNOPENABLE)(
      'should throw DilemmaNotFoundError if the dilemma is %s: nobody votes it alone',
      async (_case, change) => {
        // Arrange
        const dilemma = trolley();
        const getDilemmaPreview = await previewOf(change(dilemma) ?? dilemma);

        // Act & Assert
        await expect(getDilemmaPreview.execute({ publicId: 'TestPublicId' })).rejects.toThrow(
          DilemmaNotFoundError,
        );
      },
    );

    it.each(UNOPENABLE)(
      'should throw DilemmaNotFoundError if the dilemma is %s: no new room may start with it',
      async (_case, change) => {
        // Arrange
        const dilemma = trolley();
        const getDilemmaPreview = await previewOf(change(dilemma) ?? dilemma);

        // Act & Assert
        await expect(
          getDilemmaPreview.execute({
            publicId: 'TestPublicId',
            toStartARoom: true,
            underEighteen: false,
          }),
        ).rejects.toThrow(DilemmaNotFoundError);
      },
    );

    it('should throw DilemmaNotFoundError if the dilemma is for adults: nobody votes it alone', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(forAdults());

      // Act & Assert
      await expect(getDilemmaPreview.execute({ publicId: 'TestPublicId' })).rejects.toThrow(
        DilemmaNotFoundError,
      );
    });

    it('should open a dilemma for adults to an adult who starts a room with it', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(forAdults());

      // Act
      const preview = await getDilemmaPreview.execute({
        publicId: 'TestPublicId',
        toStartARoom: true,
        underEighteen: false,
      });

      // Assert
      expect(preview).toEqual(expect.objectContaining({ dilemmaId: 'dlm-7', minimumAge: 18 }));
    });

    it('should tell someone under 18 that a dilemma for adults is only for adults, without it', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(forAdults());

      // Act & Assert
      await expect(
        getDilemmaPreview.execute({
          publicId: 'TestPublicId',
          toStartARoom: true,
          underEighteen: true,
        }),
      ).rejects.toThrow(DilemmaOnlyForAdultsError);
    });

    it('should not open a compromising dilemma to start a room, not even to an adult', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(forAdults(true));

      // Act & Assert
      await expect(
        getDilemmaPreview.execute({
          publicId: 'TestPublicId',
          toStartARoom: true,
          underEighteen: false,
        }),
      ).rejects.toThrow(DilemmaNotFoundError);
    });

    it('should open a dilemma suitable from 16 to start a room to someone under 18', async () => {
      // Arrange
      const getDilemmaPreview = await previewOf(trolley());

      // Act
      const preview = await getDilemmaPreview.execute({
        publicId: 'TestPublicId',
        toStartARoom: true,
        underEighteen: true,
      });

      // Assert
      expect(preview.minimumAge).toBe(16);
    });
  });
});
