import { describe, expect, it } from 'vitest';
import { GetDilemmasUseCase } from '../../use-cases/get-dilemmas.use-case.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { InvalidLanguageError } from '../../../domain/errors/invalid-language.error.ts';
import { Dilemma } from '../../../domain/entities/dilemma.ts';
import { InMemoryDilemmaRepository } from '../../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';
import { GAP_MARKER } from '../../../domain/vos/gap.ts';

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
    it('should say whether the text or an option of each dilemma has the gap', async () => {
      // Arrange
      const repository = new InMemoryDilemmaRepository();
      const texts = [
        { text: `TestText about ${GAP_MARKER}`, options: ['TestOptionA', 'TestOptionB'] },
        { text: 'TestText', options: [`Save ${GAP_MARKER}`, 'TestOptionB'] },
        { text: 'TestText', options: ['TestOptionA', 'TestOptionB'] },
      ];
      for (const [index, content] of texts.entries()) {
        await repository.save(
          Dilemma.create(
            { ...CLASSIFICATION, ...content },
            new FixedIdGenerator(
              `TestDilemma${index}`,
              `TestOption${index}A`,
              `TestOption${index}B`,
            ),
          ),
        );
      }

      // Act
      const { dilemmas } = await new GetDilemmasUseCase(repository).execute({
        dilemmas: texts.map((_, index) => ({ dilemmaId: `TestDilemma${index}` })),
      });

      // Assert
      expect(dilemmas.map(({ hasGap }) => hasGap)).toEqual([true, true, false]);
      expect(dilemmas[0]?.text).toBe(`TestText about ${GAP_MARKER}`);
    });

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
          hasGap: false,
          language: 'es',
        },
        {
          dilemmaId: 'TestDilemma1',
          version: 2,
          text: 'TestRevisedText1',
          options: [
            { optionId: 'TestOption1A', text: 'TestOptionA' },
            { optionId: 'TestOption1B', text: 'TestOptionB' },
          ],
          hasGap: false,
          language: 'es',
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

    describe('in the language of the player', () => {
      const ORIGINAL = {
        ...CLASSIFICATION,
        text: 'TestTextEs',
        options: ['TestOptionEsA', 'TestOptionEsB'],
      };

      function translationOf(original: Dilemma, language: string) {
        return Dilemma.translate(
          original,
          {
            language,
            text: `TestText${language}`,
            options: [`TestOption${language}A`, `TestOption${language}B`],
            tags: [],
          },
          new FixedIdGenerator(
            `TestDilemma${language}`,
            `TestOption${language}IdA`,
            `TestOption${language}IdB`,
          ),
        );
      }

      /** An original in Spanish with its translations into English and French. */
      async function catalogInThreeLanguages() {
        const repository = new InMemoryDilemmaRepository();
        const original = Dilemma.create(
          ORIGINAL,
          new FixedIdGenerator('TestDilemmaEs', 'TestOptionEsIdA', 'TestOptionEsIdB'),
        );
        await repository.save(original);
        await repository.save(translationOf(original, 'en'));
        await repository.save(translationOf(original, 'fr'));
        return { repository, original, getDilemmas: new GetDilemmasUseCase(repository) };
      }

      it('should return the translation, with the ids of the options of the dilemma played', async () => {
        // Arrange
        const { getDilemmas } = await catalogInThreeLanguages();

        // Act
        const { dilemmas } = await getDilemmas.execute({
          dilemmas: [{ dilemmaId: 'TestDilemmaEs' }],
          language: 'en',
        });

        // Assert
        expect(dilemmas[0]).toEqual({
          dilemmaId: 'TestDilemmaEs',
          version: 1,
          text: 'TestTexten',
          options: [
            { optionId: 'TestOptionEsIdA', text: 'TestOptionenA' },
            { optionId: 'TestOptionEsIdB', text: 'TestOptionenB' },
          ],
          hasGap: false,
          language: 'en',
        });
      });

      it('should return the original when a translation is played', async () => {
        // Arrange
        const { getDilemmas } = await catalogInThreeLanguages();

        // Act
        const { dilemmas } = await getDilemmas.execute({
          dilemmas: [{ dilemmaId: 'TestDilemmaen' }],
          language: 'es',
        });

        // Assert
        expect(dilemmas[0]).toMatchObject({
          dilemmaId: 'TestDilemmaen',
          text: 'TestTextEs',
          options: [
            { optionId: 'TestOptionenIdA', text: 'TestOptionEsA' },
            { optionId: 'TestOptionenIdB', text: 'TestOptionEsB' },
          ],
          language: 'es',
        });
      });

      it('should return another translation when a translation is played', async () => {
        // Arrange
        const { getDilemmas } = await catalogInThreeLanguages();

        // Act
        const { dilemmas } = await getDilemmas.execute({
          dilemmas: [{ dilemmaId: 'TestDilemmaen' }],
          language: 'fr',
        });

        // Assert
        expect(dilemmas[0]).toMatchObject({
          dilemmaId: 'TestDilemmaen',
          text: 'TestTextfr',
          language: 'fr',
        });
      });

      it('should return the dilemma played when there is no translation into that language', async () => {
        // Arrange
        const { getDilemmas } = await catalogInThreeLanguages();

        // Act
        const { dilemmas } = await getDilemmas.execute({
          dilemmas: [{ dilemmaId: 'TestDilemmaEs' }],
          language: 'de',
        });

        // Assert
        expect(dilemmas[0]).toMatchObject({ text: 'TestTextEs', language: 'es' });
      });

      it('should return the dilemma played when no translation translates the version played', async () => {
        // Arrange
        const { repository, original, getDilemmas } = await catalogInThreeLanguages();
        original.revise(
          {
            ...ORIGINAL,
            text: 'TestRevisedTextEs',
            options: original.options.map((option) => ({ ...option })),
          },
          new FixedIdGenerator(),
        );
        await repository.save(original);

        // Act
        const { dilemmas } = await getDilemmas.execute({
          dilemmas: [{ dilemmaId: 'TestDilemmaEs', version: 2 }],
          language: 'en',
        });

        // Assert
        expect(dilemmas[0]).toMatchObject({ text: 'TestRevisedTextEs', language: 'es' });
      });

      it('should return the dilemma played when its translation cannot be read', async () => {
        // Arrange
        const { repository, getDilemmas } = await catalogInThreeLanguages();
        const english = await repository.findById('TestDilemmaen');
        english?.withdraw();
        if (english) await repository.save(english);

        // Act
        const { dilemmas } = await getDilemmas.execute({
          dilemmas: [{ dilemmaId: 'TestDilemmaEs' }],
          language: 'en',
        });

        // Assert
        expect(dilemmas[0]).toMatchObject({ text: 'TestTextEs', language: 'es' });
      });
    });

    it('should return the text of the dilemma played when there is no translation', async () => {
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
