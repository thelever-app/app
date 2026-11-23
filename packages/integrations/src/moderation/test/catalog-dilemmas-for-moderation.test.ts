import { describe, expect, it } from 'vitest';
import {
  Dilemma,
  FindDilemmaOfReferenceUseCase,
  GetDilemmasUseCase,
  ModerateDilemmaUseCase,
} from '@thelever-app/dilemmas';
import { InMemoryDilemmaRepository, SequentialIdGenerator } from '@thelever-app/dilemmas/in-memory';
import { CatalogDilemmasForModeration } from '../catalog-dilemmas-for-moderation.ts';

async function arrange() {
  const repository = new InMemoryDilemmaRepository();
  const dilemma = Dilemma.create(
    {
      text: 'TestText',
      options: ['TestA', 'TestB'],
      language: 'es',
      category: 'honesty',
      tags: [],
      minimumAge: 16,
      type: 'standard',
      compromising: false,
      scale: 'everyday',
      fixedOrder: false,
    },
    new SequentialIdGenerator('dilemma'),
  );
  await repository.save(dilemma);
  return {
    repository,
    dilemmaId: dilemma.id,
    dilemmas: new CatalogDilemmasForModeration({
      findDilemmaOfReference: new FindDilemmaOfReferenceUseCase(repository),
      getDilemmas: new GetDilemmasUseCase(repository),
      moderateDilemma: new ModerateDilemmaUseCase(repository, ['en']),
      languages: ['en'],
    }),
  };
}

describe('CatalogDilemmasForModeration', () => {
  it('should give the text of a dilemma, and none of one that does not exist', async () => {
    // Arrange
    const { dilemmas, dilemmaId } = await arrange();

    // Act & Assert
    expect(await dilemmas.textOf(dilemmaId)).toBe('TestText');
    expect(await dilemmas.textOf('TestMissing')).toBeNull();
  });

  it('should hide, restore and withdraw the dilemma', async () => {
    // Arrange
    const { dilemmas, dilemmaId, repository } = await arrange();

    // Act
    await dilemmas.hide(dilemmaId);
    const hidden = (await repository.findById(dilemmaId))?.status;
    await dilemmas.restore(dilemmaId);
    const restored = (await repository.findById(dilemmaId))?.status;
    await dilemmas.withdraw(dilemmaId);

    // Assert
    expect([hidden, restored, (await repository.findById(dilemmaId))?.status]).toEqual([
      'hidden-by-reports',
      'in-catalog',
      'withdrawn',
    ]);
  });

  it('should find no dilemma in a reference that names none', async () => {
    // Arrange
    const { dilemmas } = await arrange();

    // Act & Assert
    expect(await dilemmas.dilemmaOf('Sala ABCD, apodo Pepe')).toBeNull();
  });
});
