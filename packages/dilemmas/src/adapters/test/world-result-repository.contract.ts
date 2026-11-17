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
 * a version 2, its current one, with at least two options each.
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
        await repository.publish(1);

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
        await repository.publish(1);

        // Assert
        expect(again).toBe(false);
        expect(newVersion).toBe(true);
        expect(await repository.publishedCountsOf('TestDilemmaId', 1)).toEqual(new Map([[0, 1]]));
        expect(await repository.publishedCountsOf('TestDilemmaId', 2)).toEqual(new Map([[0, 1]]));
      });
    });

    describe('countVote, twice at the same time', () => {
      it('should count only one of two votes of the same identity cast at the same time', async () => {
        // Arrange
        const repository = await create();

        // Act
        const counted = await Promise.all([
          repository.countVote('TestIdentity', FIRST),
          repository.countVote('TestIdentity', SECOND),
        ]);
        await repository.publish(1);

        // Assert
        expect(counted.filter(Boolean)).toHaveLength(1);
        const counts = await repository.publishedCountsOf('TestDilemmaId', 1);
        expect([...counts.values()].reduce((total, count) => total + count, 0)).toBe(1);
      });
    });

    describe('publish', () => {
      it('should publish the counts of a version only once it has that many new answers since it was last published', async () => {
        // Arrange
        const repository = await create();
        for (const voter of [1, 2, 3]) await repository.countVote(`TestIdentity${voter}`, FIRST);
        await repository.publish(3);
        await repository.countVote('TestIdentity4', FIRST);
        await repository.countVote('TestIdentity5', SECOND);

        // Act
        await repository.publish(3);
        const kept = await repository.publishedCountsOf('TestDilemmaId', 1);
        await repository.countVote('TestIdentity6', SECOND);
        await repository.publish(3);

        // Assert: two new answers keep the last result; the third publishes the counts of now.
        expect(kept).toEqual(new Map([[0, 3]]));
        expect(await repository.publishedCountsOf('TestDilemmaId', 1)).toEqual(
          new Map([
            [0, 4],
            [1, 2],
          ]),
        );
      });
    });

    describe('forgetReceiptsOfFormerVersions', () => {
      it('should forget who voted a version that is no longer the current one, and keep its answers', async () => {
        // Arrange
        const repository = await create();
        await repository.countVote('TestIdentity', FIRST);
        await repository.countVote('TestIdentity', { ...FIRST, version: 2 });
        await repository.publish(1);

        // Act
        await repository.forgetReceiptsOfFormerVersions();

        // Assert: the identity may vote the version 1 again, never the current one.
        expect(await repository.countVote('TestIdentity', SECOND)).toBe(true);
        expect(await repository.countVote('TestIdentity', { ...SECOND, version: 2 })).toBe(false);
        expect(await repository.publishedCountsOf('TestDilemmaId', 1)).toEqual(new Map([[0, 1]]));
      });
    });

    describe('publishedCountsOf', () => {
      it('should not show the votes counted since the results were last published', async () => {
        // Arrange
        const repository = await create();
        await repository.countVote('TestIdentity1', FIRST);
        await repository.publish(1);

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
