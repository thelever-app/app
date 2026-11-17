import { describe, expect, it } from 'vitest';
import { InMemoryDilemmaRepository } from '../../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { InMemoryWorldResultRepository } from '../../../adapters/in-memory/in-memory-world-result-repository.ts';
import { Dilemma } from '../../../domain/entities/dilemma.ts';
import { InvalidPredictionError } from '../../../domain/errors/invalid-prediction.error.ts';
import { UnknownOptionError } from '../../../domain/errors/unknown-option.error.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';
import type { MinimumAge } from '../../../domain/vos/minimum-age.vo.ts';
import { AlreadyVotedError } from '../../errors/already-voted.error.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { GetWorldResultUseCase } from '../../use-cases/get-world-result.use-case.ts';
import { PublishWorldResultsUseCase } from '../../use-cases/publish-world-results.use-case.ts';
import { VoteAloneUseCase } from '../../use-cases/vote-alone.use-case.ts';

/** The trolley, in Spanish, in the general catalog: two options, as the public web shows it. */
function trolley(minimumAge: MinimumAge = 16): Dilemma {
  return Dilemma.create(
    {
      text: 'TestText',
      language: 'es',
      name: 'TestName',
      options: ['TestOptionA', 'TestOptionB'],
      category: 'life-and-death',
      tags: [],
      minimumAge,
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    },
    new FixedIdGenerator('dlm-1', 'dlm-1-a', 'dlm-1-b', 'TestPublicId'),
  );
}

/** Its English translation. */
function inEnglish(original: Dilemma): Dilemma {
  return Dilemma.translate(
    original,
    {
      language: 'en',
      name: 'TestNameEn',
      text: 'TestTextEn',
      options: ['TestOptionAEn', 'TestOptionBEn'],
      tags: [],
    },
    new FixedIdGenerator('dlm-1-en', 'dlm-1-en-a', 'dlm-1-en-b', 'TestEnglishPublicId'),
  );
}

async function worldWith(...dilemmas: Dilemma[]) {
  const dilemmaRepository = new InMemoryDilemmaRepository();
  for (const dilemma of dilemmas) await dilemmaRepository.save(dilemma);
  const results = new InMemoryWorldResultRepository(
    async (id) => (await dilemmaRepository.findById(id))?.version,
  );
  return {
    results,
    voteAlone: new VoteAloneUseCase(dilemmaRepository, results),
    getWorldResult: new GetWorldResultUseCase(dilemmaRepository, results),
    publish: new PublishWorldResultsUseCase(results),
  };
}

describe('VoteAloneUseCase', () => {
  describe('execute', () => {
    it('should count a vote cast on a translation for the version of the original, by the position of its option', async () => {
      // Arrange
      const original = trolley();
      const { voteAlone, results } = await worldWith(original, inEnglish(original));

      // Act
      await voteAlone.execute({
        identity: 'TestIdentity',
        publicId: 'TestEnglishPublicId',
        optionId: 'dlm-1-en-b',
      });

      // Assert
      expect([...results.records().counts]).toEqual([[JSON.stringify(['dlm-1', 1, 1]), 1]]);
    });

    it('should not count a second vote of the same identity for the same version', async () => {
      // Arrange
      const original = trolley();
      const { voteAlone } = await worldWith(original, inEnglish(original));
      await voteAlone.execute({
        identity: 'TestIdentity',
        publicId: 'TestPublicId',
        optionId: 'dlm-1-a',
      });

      // Act & Assert: also from its translation, which counts with it.
      await expect(
        voteAlone.execute({
          identity: 'TestIdentity',
          publicId: 'TestEnglishPublicId',
          optionId: 'dlm-1-en-b',
        }),
      ).rejects.toThrow(AlreadyVotedError);
    });

    it('should not open a dilemma a link of the public web does not lead to', async () => {
      // Arrange
      const { voteAlone } = await worldWith(trolley(18));

      // Act & Assert
      await expect(
        voteAlone.execute({
          identity: 'TestIdentity',
          publicId: 'TestPublicId',
          optionId: 'dlm-1-a',
        }),
      ).rejects.toThrow(DilemmaNotFoundError);
    });

    it('should reject an option the dilemma does not have', async () => {
      // Arrange
      const original = trolley();
      const { voteAlone } = await worldWith(original, inEnglish(original));

      // Act & Assert: an option of its translation is not one of the original.
      await expect(
        voteAlone.execute({
          identity: 'TestIdentity',
          publicId: 'TestPublicId',
          optionId: 'dlm-1-en-a',
        }),
      ).rejects.toThrow(UnknownOptionError);
    });

    it('should keep who voted and how many voted each option, never what each one voted', async () => {
      // Arrange
      const { voteAlone, results } = await worldWith(trolley());

      // Act
      await voteAlone.execute({
        identity: 'TestIdentity',
        publicId: 'TestPublicId',
        optionId: 'dlm-1-b',
      });

      // Assert
      const { receipts, counts } = results.records();
      expect(JSON.stringify(receipts)).not.toContain('dlm-1-b');
      expect(JSON.stringify([...counts])).not.toContain('TestIdentity');
    });
  });
});

describe('GetWorldResultUseCase', () => {
  describe('execute', () => {
    it('should show no figures while the published result has fewer than 20 answers', async () => {
      // Arrange
      const { voteAlone, publish, getWorldResult } = await worldWith(trolley());
      for (let voter = 0; voter < 19; voter += 1) {
        await voteAlone.execute({
          identity: `TestIdentity${voter}`,
          publicId: 'TestPublicId',
          optionId: 'dlm-1-a',
        });
      }
      await publish.execute();

      // Act
      const result = await getWorldResult.execute({
        publicId: 'TestPublicId',
        optionId: 'dlm-1-a',
        prediction: 50,
      });

      // Assert
      expect(result).toEqual({ shown: false, answers: 19, needed: 20 });
    });

    it('should show how the world voted, adding up the translations, in the options of the language of the link', async () => {
      // Arrange: 15 in Spanish and 5 in English, 16 for the first option and 4 for the second.
      const original = trolley();
      const { voteAlone, publish, getWorldResult } = await worldWith(original, inEnglish(original));
      for (let voter = 0; voter < 20; voter += 1) {
        const english = voter >= 15;
        await voteAlone.execute({
          identity: `TestIdentity${voter}`,
          publicId: english ? 'TestEnglishPublicId' : 'TestPublicId',
          optionId: `dlm-1${english ? '-en' : ''}-${voter % 5 === 4 ? 'b' : 'a'}`,
        });
      }
      await publish.execute();

      // Act
      const result = await getWorldResult.execute({
        publicId: 'TestEnglishPublicId',
        optionId: 'dlm-1-en-a',
        prediction: 70,
      });

      // Assert
      expect(result).toEqual({
        shown: true,
        answers: 20,
        options: [
          { optionId: 'dlm-1-en-a', percentage: 80 },
          { optionId: 'dlm-1-en-b', percentage: 20 },
        ],
        yours: { percentage: 80, predictionOff: 10 },
      });
    });

    it('should reject a prediction that is not a whole percentage from 0 to 100', async () => {
      // Arrange
      const { getWorldResult } = await worldWith(trolley());

      // Act & Assert
      await expect(
        getWorldResult.execute({ publicId: 'TestPublicId', optionId: 'dlm-1-a', prediction: 120 }),
      ).rejects.toThrow(InvalidPredictionError);
    });
  });
});
