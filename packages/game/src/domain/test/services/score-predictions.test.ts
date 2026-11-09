import { describe, expect, it } from 'vitest';
import { scorePredictions } from '../../services/score-predictions.ts';
import { AnswerVO, type VotePrediction } from '../../vos/answer.vo.ts';

const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};

function answer(vote: string, votePredictions: VotePrediction[] = []): AnswerVO {
  return new AnswerVO({
    vote,
    votePredictions,
    optionOrder: [],
    responseTimeMs: null,
    seal: SEAL,
    voterInTheGap: false,
  });
}

function score(answers: Record<string, AnswerVO | undefined>) {
  return scorePredictions({
    playerIds: ['Ana', 'Luis', 'Marta'],
    answerOf: (playerId) => answers[playerId],
  });
}

describe('scorePredictions', () => {
  it('should share 100 among the other players for the right vote predictions', () => {
    // Act
    const points = score({
      Ana: answer('pull', [
        { playerId: 'Luis', vote: 'pull' },
        { playerId: 'Marta', vote: 'pull' },
      ]),
      Luis: answer('pull'),
      Marta: answer('wait'),
    });

    // Assert
    expect(points.get('Ana')).toBe(50);
  });

  it('should only score the predictions made', () => {
    // Act
    const points = score({
      Ana: answer('pull', [{ playerId: 'Luis', vote: 'pull' }]),
      Luis: answer('pull'),
      Marta: answer('pull'),
    });

    // Assert
    expect(points.get('Ana')).toBe(50);
    expect(points.get('Luis')).toBeNull();
  });

  it('should not count right a prediction about a player who did not vote', () => {
    // Act
    const points = score({ Ana: answer('pull', [{ playerId: 'Luis', vote: 'pull' }]) });

    // Assert
    expect(points.get('Ana')).toBe(0);
  });

  it('should give nothing to a player who did not vote', () => {
    // Act & Assert
    expect(score({}).get('Ana')).toBeNull();
  });
});
