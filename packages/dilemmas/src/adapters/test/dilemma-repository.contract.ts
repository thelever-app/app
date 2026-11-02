import { describe, expect, it } from 'vitest';
import type { DilemmaRepository } from '../../application/ports/dilemma-repository.port.ts';
import { Dilemma } from '../../domain/entities/dilemma.ts';
import { FixedIdGenerator } from '../../domain/test/support/fixed-id-generator.ts';

function dilemma(): Dilemma {
  return Dilemma.create(
    {
      text: 'TestDilemmaText',
      language: 'es',
      options: ['TestOption1', 'TestOption2', 'TestOption3'],
    },
    new FixedIdGenerator('TestDilemmaId', 'TestOptionId1', 'TestOptionId2', 'TestOptionId3'),
  );
}

/**
 * What every DilemmaRepository must do, in memory or in PostgreSQL (ADR 0002).
 * `create` returns a repository with no dilemmas.
 */
export function describeDilemmaRepositoryContract(
  name: string,
  create: () => Promise<DilemmaRepository>,
): void {
  describe(`${name} (DilemmaRepository contract)`, () => {
    describe('findById', () => {
      it('should find a saved dilemma as it was saved, with its options in order', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());

        // Act
        const found = await repository.findById('TestDilemmaId');

        // Assert
        expect(found?.toSnapshot()).toEqual(dilemma().toSnapshot());
      });

      it('should return undefined if the dilemma does not exist', async () => {
        // Arrange
        const repository = await create();

        // Act
        const found = await repository.findById('TestUnknownId');

        // Assert
        expect(found).toBeUndefined();
      });

      it('should return a copy, not the saved dilemma', async () => {
        // Arrange
        const repository = await create();
        const saved = dilemma();
        await repository.save(saved);

        // Act
        const found = await repository.findById('TestDilemmaId');

        // Assert
        expect(found).not.toBe(saved);
      });
    });
  });
}
