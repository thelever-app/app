import { describe, expect, it } from 'vitest';
import { AnswerDilemmaDto, ClientMessageDto } from '../client-messages.ts';

const answerDilemma = { type: 'answer-dilemma', dilemmaId: 'dilemma-1', vote: 'option-1' };

describe('AnswerDilemmaDto', () => {
  it('should accept a well-formed message from the network', () => {
    // Arrange
    const raw = JSON.parse(JSON.stringify(answerDilemma)) as unknown;

    // Act
    const result = AnswerDilemmaDto.safeParse(raw);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(answerDilemma);
  });

  it('should reject an unknown type', () => {
    // Act & Assert
    expect(AnswerDilemmaDto.safeParse({ ...answerDilemma, type: 'vote' }).success).toBe(false);
  });

  it('should reject an empty dilemma or vote', () => {
    // Act & Assert
    expect(AnswerDilemmaDto.safeParse({ ...answerDilemma, dilemmaId: '' }).success).toBe(false);
    expect(AnswerDilemmaDto.safeParse({ ...answerDilemma, vote: '' }).success).toBe(false);
  });

  it('should reject a player or a game sent by the client', () => {
    // Act & Assert
    expect(AnswerDilemmaDto.safeParse({ ...answerDilemma, playerId: 'player-1' }).success).toBe(
      false,
    );
    expect(AnswerDilemmaDto.safeParse({ ...answerDilemma, gameId: 'game-1' }).success).toBe(false);
  });
});

describe('ClientMessageDto', () => {
  it('should accept an answer', () => {
    // Act & Assert
    expect(ClientMessageDto.parse(answerDilemma).type).toBe('answer-dilemma');
  });

  it('should reject a message no schema knows', () => {
    // Act & Assert
    expect(ClientMessageDto.safeParse({ type: 'start-reveal' }).success).toBe(false);
  });
});
