import { describe, expect, it } from 'vitest';
import { scorePredictions } from '../../services/score-predictions.ts';
import { AnswerVO, type VotePrediction } from '../../vos/answer.vo.ts';

const SEAL = {
  gameConsentVersion: 'TestGameConsentVersion',
  researchConsentVersion: null,
  commercialLicenceConsentVersion: null,
  underEighteen: false,
};

function answer(vote: string | null, votePredictions: VotePrediction[] = []): AnswerVO {
  return new AnswerVO({
    vote,
    votePredictions,
    distributionPrediction: null,
    ready: false,
    optionOrder: [],
    responseTimeMs: null,
    seal: SEAL,
  });
}

const PLAYERS = ['Ana', 'Luis', 'Marta'];

function score(
  answers: Record<string, AnswerVO | undefined>,
  predictedBy = (playerId: string) => PLAYERS.filter((other) => other !== playerId),
) {
  return scorePredictions({
    playerIds: PLAYERS,
    answerOf: (playerId) => answers[playerId],
    predictedBy,
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

  it('should share 100 among the players each one predicts, without the person in the gap', () => {
    // Act
    // Marta is the person in the gap: nobody predicts her, and she predicts Ana and Luis.
    const points = score(
      {
        Ana: answer('pull', [{ playerId: 'Luis', vote: 'pull' }]),
        Luis: answer('pull', [{ playerId: 'Ana', vote: 'wait' }]),
        Marta: answer(null, [
          { playerId: 'Ana', vote: 'pull' },
          { playerId: 'Luis', vote: 'wait' },
        ]),
      },
      (playerId) =>
        playerId === 'Marta' ? ['Ana', 'Luis'] : playerId === 'Ana' ? ['Luis'] : ['Ana'],
    );

    // Assert
    expect(points.get('Ana')).toBe(100);
    expect(points.get('Luis')).toBe(0);
    expect(points.get('Marta')).toBe(50);
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
