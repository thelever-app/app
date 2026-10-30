import { describe, expect, it } from 'vitest';
import {
  AnswerDilemmaDto,
  ClientMessageDto,
  ClientMessageTypeDto,
  CONTRACT_VERSION,
  ConnectDto,
} from '../client-messages.ts';

const connect = {
  type: 'connect',
  contractVersion: CONTRACT_VERSION,
  token: 'firebase-id-token',
  gameId: 'game-1',
  language: 'es',
};

const answerDilemma = { type: 'answer-dilemma', dilemmaId: 'dilemma-1', vote: 'option-1' };

describe('ConnectDto', () => {
  it('should accept a well-formed message from the network', () => {
    // Arrange
    const raw = JSON.parse(JSON.stringify(connect)) as unknown;

    // Act
    const result = ConnectDto.safeParse(raw);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(connect);
  });

  it('should reject a contract version that is not a positive integer', () => {
    // Act & Assert
    expect(ConnectDto.safeParse({ ...connect, contractVersion: 0 }).success).toBe(false);
    expect(ConnectDto.safeParse({ ...connect, contractVersion: 1.5 }).success).toBe(false);
    expect(ConnectDto.safeParse({ ...connect, contractVersion: '1' }).success).toBe(false);
  });

  it('should reject an empty token or game', () => {
    // Act & Assert
    expect(ConnectDto.safeParse({ ...connect, token: '' }).success).toBe(false);
    expect(ConnectDto.safeParse({ ...connect, gameId: '' }).success).toBe(false);
  });

  it('should accept every supported language and reject any other', () => {
    // Act & Assert
    for (const language of ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca']) {
      expect(ConnectDto.safeParse({ ...connect, language }).success).toBe(true);
    }
    expect(ConnectDto.safeParse({ ...connect, language: 'ja' }).success).toBe(false);
  });

  it('should reject a player sent by the client', () => {
    // Act & Assert
    expect(ConnectDto.safeParse({ ...connect, playerId: 'player-1' }).success).toBe(false);
  });
});

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
  it('should tell the messages apart by their type', () => {
    // Act & Assert
    expect(ClientMessageDto.parse(connect).type).toBe('connect');
    expect(ClientMessageDto.parse(answerDilemma).type).toBe('answer-dilemma');
  });

  it('should reject a message no schema knows', () => {
    // Act & Assert
    expect(ClientMessageDto.safeParse({ type: 'start-reveal' }).success).toBe(false);
  });
});

describe('ClientMessageTypeDto', () => {
  it('should name exactly the types of the client messages', () => {
    // Arrange
    const types = ClientMessageDto.options.map((message) => message.shape.type.value);

    // Assert
    expect([...ClientMessageTypeDto.options].sort()).toEqual(types.sort());
  });
});
