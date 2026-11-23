import { describe, expect, it } from 'vitest';
import { ModerateDilemmaUseCase } from '../../use-cases/moderate-dilemma.use-case.ts';
import { FindDilemmaOfReferenceUseCase } from '../../use-cases/find-dilemma-of-reference.use-case.ts';
import { DilemmaNotFoundError } from '../../errors/dilemma-not-found.error.ts';
import { Dilemma } from '../../../domain/entities/dilemma.ts';
import { InMemoryDilemmaRepository } from '../../../adapters/in-memory/in-memory-dilemma-repository.ts';
import { FixedIdGenerator } from '../../../domain/test/support/fixed-id-generator.ts';

const DATA = {
  language: 'es',
  category: 'honesty',
  tags: [],
  minimumAge: 16,
  type: 'standard',
  compromising: false,
  scale: 'everyday',
  fixedOrder: false,
  text: 'TestText',
  options: ['TestOptionA', 'TestOptionB'],
};

/** Dilemma 7 of the catalog, in Spanish, with its translation into English. */
async function catalog() {
  const repository = new InMemoryDilemmaRepository();
  const original = Dilemma.create(
    DATA,
    new FixedIdGenerator('dlm-7', 'TestOptionA', 'TestOptionB', 'TestPublicId7'),
  );
  await repository.save(original);
  const translation = Dilemma.translate(
    original,
    { language: 'en', text: 'TestText en', options: ['TestA', 'TestB'], tags: [] },
    new FixedIdGenerator('dlm-7-en', 'TestOptionEnA', 'TestOptionEnB', 'TestPublicId7en'),
  );
  await repository.save(translation);
  return repository;
}

describe('ModerateDilemmaUseCase', () => {
  it('should hide a dilemma of the catalog with its translations', async () => {
    // Arrange
    const repository = await catalog();
    const moderate = new ModerateDilemmaUseCase(repository, ['en', 'fr']);

    // Act
    await moderate.execute({ dilemmaId: 'dlm-7-en', action: 'hide' });

    // Assert
    expect((await repository.findById('dlm-7'))?.status).toBe('hidden-by-reports');
    expect((await repository.findById('dlm-7-en'))?.status).toBe('hidden-by-reports');
  });

  it('should bring them back, or withdraw them, as the team decides', async () => {
    // Arrange
    const repository = await catalog();
    const moderate = new ModerateDilemmaUseCase(repository, ['en']);
    await moderate.execute({ dilemmaId: 'dlm-7', action: 'hide' });

    // Act
    await moderate.execute({ dilemmaId: 'dlm-7', action: 'restore' });

    // Assert
    expect((await repository.findById('dlm-7-en'))?.status).toBe('in-catalog');
    await moderate.execute({ dilemmaId: 'dlm-7', action: 'withdraw' });
    expect((await repository.findById('dlm-7'))?.moderation?.by).toBe('withdrawn');
  });

  it('should throw an error for a dilemma that does not exist', async () => {
    // Arrange
    const moderate = new ModerateDilemmaUseCase(await catalog(), ['en']);

    // Act & Assert
    await expect(moderate.execute({ dilemmaId: 'dlm-8', action: 'hide' })).rejects.toThrow(
      DilemmaNotFoundError,
    );
  });
});

describe('FindDilemmaOfReferenceUseCase', () => {
  it.each([
    { reference: 'https://thelever.app/en/honesty/the-test-7', dilemmaId: 'dlm-7-en' },
    { reference: 'thelever.app/fr/honnetete/le-test-7', dilemmaId: null },
    { reference: 'https://thelever.app/fr/honnetete/le-test-7', dilemmaId: 'dlm-7' },
    { reference: '/es/honestidad/el-test-7?utm_source=x', dilemmaId: 'dlm-7' },
    { reference: ' #7 ', dilemmaId: 'dlm-7' },
    { reference: '8', dilemmaId: null },
    { reference: 'https://thelever.app/d/TestPublicId7en', dilemmaId: 'dlm-7-en' },
    { reference: 'Sala ABCD, apodo Pepe', dilemmaId: null },
  ])('should find $dilemmaId from «$reference»', async ({ reference, dilemmaId }) => {
    // Arrange
    const find = new FindDilemmaOfReferenceUseCase(await catalog());

    // Act & Assert
    expect(await find.execute(reference)).toBe(dilemmaId);
  });
});
