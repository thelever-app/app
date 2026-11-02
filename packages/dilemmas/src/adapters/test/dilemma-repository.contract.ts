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
      category: 'honesty',
      tags: ['testtag1', 'testtag2'],
      minimumAge: 16,
    },
    new FixedIdGenerator('TestDilemmaId', 'TestOptionId1', 'TestOptionId2', 'TestOptionId3'),
  );
}

/** The dilemma at its second version, which drops an option and adds another one. */
function revised(): Dilemma {
  const revisedDilemma = dilemma();
  revisedDilemma.revise(
    {
      text: 'TestRevisedText',
      options: [
        { id: 'TestOptionId1', text: 'TestOption1' },
        { id: 'TestOptionId3', text: 'TestOption3' },
        { text: 'TestOption4' },
      ],
      category: 'loyalty',
      tags: ['testtag3'],
      minimumAge: 18,
    },
    new FixedIdGenerator('TestOptionId4'),
  );
  return revisedDilemma;
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

      it('should find the current version of a revised dilemma', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(revised());

        // Act
        const found = await repository.findById('TestDilemmaId');

        // Assert
        expect(found?.toSnapshot()).toEqual(revised().toSnapshot());
      });
    });

    describe('findVersion', () => {
      it('should find an earlier version as it was saved', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(revised());

        // Act
        const found = await repository.findVersion('TestDilemmaId', 1);

        // Assert
        expect(found?.toSnapshot()).toEqual(dilemma().toSnapshot());
      });

      it('should find the current version too', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        await repository.save(revised());

        // Act
        const found = await repository.findVersion('TestDilemmaId', 2);

        // Assert
        expect(found?.toSnapshot()).toEqual(revised().toSnapshot());
      });

      it('should return undefined if the version does not exist', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());

        // Act
        const found = await repository.findVersion('TestDilemmaId', 2);

        // Assert
        expect(found).toBeUndefined();
      });

      it('should return undefined if the dilemma does not exist', async () => {
        // Arrange
        const repository = await create();

        // Act
        const found = await repository.findVersion('TestUnknownId', 1);

        // Assert
        expect(found).toBeUndefined();
      });
    });

    describe('save', () => {
      it('should keep a new status and visibility without making a new version', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());
        // As the moderation of a version will, until the dilemma has operations for it.
        const snapshot = dilemma().toSnapshot();
        const hidden = Dilemma.restore({
          ...snapshot,
          visibility: 'private',
          version: { ...snapshot.version, status: 'hidden-by-reports' },
        });

        // Act
        await repository.save(hidden);

        // Assert
        const found = await repository.findById('TestDilemmaId');
        expect(found?.toSnapshot()).toEqual(hidden.toSnapshot());
        expect((await repository.findVersion('TestDilemmaId', 1))?.status).toBe(
          'hidden-by-reports',
        );
      });

      it('should keep the earlier versions when it saves a new one', async () => {
        // Arrange
        const repository = await create();
        await repository.save(dilemma());

        // Act
        await repository.save(revised());

        // Assert
        expect((await repository.findVersion('TestDilemmaId', 1))?.options).toHaveLength(3);
        expect((await repository.findVersion('TestDilemmaId', 2))?.text).toBe('TestRevisedText');
      });
    });
  });
}
