import { describe, expect, it } from 'vitest';
import { scorePredictions } from '../../services/score-predictions.ts';
import { AnswerVO, type VotePrediction } from '../../vos/answer.vo.ts';

const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};

function answer(
  vote: string,
  matchPrediction: number | null = null,
  votePredictions: VotePrediction[] = [],
): AnswerVO {
  return new AnswerVO({
    vote,
    matchPrediction,
    votePredictions,
    optionOrder: [],
    responseTimeMs: null,
    seal: SEAL,
    voterInTheGap: false,
  });
}

function score(
  answers: Record<string, AnswerVO | undefined>,
  subsets: Record<string, string[]> = {},
) {
  return scorePredictions({
    playerIds: ['Ana', 'Luis', 'Marta'],
    answerOf: (playerId) => answers[playerId],
    subsetOf: (playerId) => subsets[playerId] ?? ['Luis', 'Marta'].filter((id) => id !== playerId),
  });
}

describe('scorePredictions', () => {
  it('should give 100 to an exact match prediction and less the further it is', () => {
    // Act
    const points = score({
      Ana: answer('pull', 1),
      Luis: answer('pull', 0),
      Marta: answer('wait', 2),
    });

    // Assert
    expect(points.get('Ana')?.match).toBe(100);
    expect(points.get('Luis')?.match).toBe(50);
    expect(points.get('Marta')?.match).toBe(0);
  });

  it('should share 100 among the subset for the right vote predictions', () => {
    // Act
    const points = score(
      {
        Ana: answer('pull', null, [
          { playerId: 'Luis', vote: 'pull' },
          { playerId: 'Marta', vote: 'pull' },
        ]),
        Luis: answer('pull'),
        Marta: answer('wait'),
      },
      { Ana: ['Luis', 'Marta'] },
    );

    // Assert
    expect(points.get('Ana')).toEqual({ match: null, votes: 50 });
  });

  it('should only score the predictions made', () => {
    // Act
    const points = score({ Ana: answer('pull', 2), Luis: answer('pull'), Marta: answer('pull') });

    // Assert
    expect(points.get('Ana')).toEqual({ match: 100, votes: null });
    expect(points.get('Luis')).toEqual({ match: null, votes: null });
  });

  it('should not count right a prediction about a player who did not vote', () => {
    // Act
    const points = score(
      { Ana: answer('pull', 0, [{ playerId: 'Luis', vote: 'pull' }]) },
      { Ana: ['Luis'] },
    );

    // Assert
    expect(points.get('Ana')).toEqual({ match: 100, votes: 0 });
  });

  it('should give nothing to a player who did not vote', () => {
    // Act & Assert
    expect(score({}).get('Ana')).toEqual({ match: null, votes: null });
  });
});
