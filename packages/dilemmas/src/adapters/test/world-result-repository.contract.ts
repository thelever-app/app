import { describe, expect, it } from 'vitest';
import type {
  Ballot,
  WorldResultRepository,
} from '../../application/ports/world-result-repository.port.ts';

const FIRST: Ballot = { dilemmaId: 'TestDilemmaId', version: 1, position: 0 };
const SECOND: Ballot = { ...FIRST, position: 1 };

/**
 * What every WorldResultRepository must do, in memory or in PostgreSQL (ADR 0002).
 * `create` returns a repository with no votes, where the dilemma TestDilemmaId has a version 1 and
 * a version 2 with at least two options each.
 */
export function describeWorldResultRepositoryContract(
  name: string,
  create: () => Promise<WorldResultRepository>,
): void {
  describe(`${name} (WorldResultRepository contract)`, () => {
    describe('countVote', () => {
      it('should count each vote for its option, published once the results are', async () => {
        // Arrange
        const repository = await create();

        // Act
        await repository.countVote('TestIdentity1', FIRST);
        await repository.countVote('TestIdentity2', SECOND);
        await repository.countVote('TestIdentity3', FIRST);
        await repository.publish();

        // Assert
        expect(await repository.publishedCountsOf('TestDilemmaId', 1)).toEqual(
          new Map([
            [0, 2],
            [1, 1],
          ]),
        );
      });

      it('should count a vote of an identity once for each version', async () => {
        // Arrange
        const repository = await create();
        await repository.countVote('TestIdentity', FIRST);

        // Act
        const again = await repository.countVote('TestIdentity', SECOND);
        const newVersion = await repository.countVote('TestIdentity', { ...FIRST, version: 2 });
        await repository.publish();

        // Assert
        expect(again).toBe(false);
        expect(newVersion).toBe(true);
        expect(await repository.publishedCountsOf('TestDilemmaId', 1)).toEqual(new Map([[0, 1]]));
        expect(await repository.publishedCountsOf('TestDilemmaId', 2)).toEqual(new Map([[0, 1]]));
      });
    });

    describe('publishedCountsOf', () => {
      it('should not show the votes counted since the results were last published', async () => {
        // Arrange
        const repository = await create();
        await repository.countVote('TestIdentity1', FIRST);
        await repository.publish();

        // Act
        await repository.countVote('TestIdentity2', FIRST);

        // Assert
        expect(await repository.publishedCountsOf('TestDilemmaId', 1)).toEqual(new Map([[0, 1]]));
      });

      it('should have no answers for a dilemma nobody voted', async () => {
        // Act & Assert
        expect(await (await create()).publishedCountsOf('TestDilemmaId', 1)).toEqual(new Map());
      });
    });
  });
}
