import { describe, expect, it } from 'vitest';
import {
  AnswerDilemmaDto,
  CONTRACT_VERSION,
  ClientMessageDto,
  ClientMessageTypeDto,
  ConnectDto,
  ReportDilemmaDto,
} from '../client-messages.ts';

const connect = {
  type: 'connect',
  contractVersion: CONTRACT_VERSION,
  token: 'firebase-id-token',
  roomId: 'room-1',
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

  it('should accept the App Check token of the device, when it has one', () => {
    // Act
    const result = ConnectDto.safeParse({ ...connect, appCheckToken: 'app-check-token' });

    // Assert
    expect(result.data?.appCheckToken).toBe('app-check-token');
  });

  it('should reject an empty App Check token', () => {
    // Act & Assert
    expect(ConnectDto.safeParse({ ...connect, appCheckToken: '' }).success).toBe(false);
  });

  it('should reject a contract version that is not a positive integer', () => {
    // Act & Assert
    expect(ConnectDto.safeParse({ ...connect, contractVersion: 0 }).success).toBe(false);
    expect(ConnectDto.safeParse({ ...connect, contractVersion: 1.5 }).success).toBe(false);
    expect(ConnectDto.safeParse({ ...connect, contractVersion: '1' }).success).toBe(false);
  });

  it('should reject an empty token or room', () => {
    // Act & Assert
    expect(ConnectDto.safeParse({ ...connect, token: '' }).success).toBe(false);
    expect(ConnectDto.safeParse({ ...connect, roomId: '' }).success).toBe(false);
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

describe('the trace context of a command', () => {
  const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

  it('should accept a W3C trace context on each command', () => {
    // Arrange
    const messages = [
      { ...connect, traceparent },
      { ...answerDilemma, traceparent },
    ];

    // Act
    const results = messages.map((message) => ClientMessageDto.safeParse(message));

    // Assert
    expect(results.map(({ success }) => success)).toEqual([true, true]);
    expect(results.map(({ data }) => data?.traceparent)).toEqual([traceparent, traceparent]);
  });

  it('should reject anything else in its place, so nothing else about the device travels', () => {
    // Arrange
    const malformed = [
      '00-not-a-trace',
      `${traceparent}-extra`,
      '00-0AF7651916CD43DD8448EB211C80319C-B7AD6B7169203331-01',
    ];

    // Act
    const results = malformed.map((value) =>
      AnswerDilemmaDto.safeParse({ ...answerDilemma, traceparent: value }),
    );

    // Assert
    expect(results.map(({ success }) => success)).toEqual([false, false, false]);
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
    expect(ClientMessageDto.safeParse({ type: 'move-reveal' }).success).toBe(false);
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

describe('the messages of the rounds', () => {
  it('should accept an answer with the predictions made so far, or without any', () => {
    // Arrange
    const answer = { type: 'answer-dilemma', dilemmaId: 'dilemma-1', vote: 'option-1' };

    // Act & Assert
    expect(AnswerDilemmaDto.safeParse(answer).success).toBe(true);
    expect(
      AnswerDilemmaDto.safeParse({
        ...answer,
        votePredictions: [{ playerId: 'player-1', vote: 'option-2' }],
      }).success,
    ).toBe(true);
  });

  it('should take a vote prediction about each of the other 49 players of a full room, and no more', () => {
    // Arrange
    const answer = { type: 'answer-dilemma', dilemmaId: 'dilemma-1', vote: 'option-1' };
    const about = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        playerId: `player-${index}`,
        vote: 'option-1',
      }));

    // Act & Assert
    expect(AnswerDilemmaDto.safeParse({ ...answer, votePredictions: about(49) }).success).toBe(
      true,
    );
    expect(AnswerDilemmaDto.safeParse({ ...answer, votePredictions: about(50) }).success).toBe(
      false,
    );
  });

  it('should accept starting the reveal, leaving and reporting a dilemma', () => {
    // Act & Assert
    expect(ClientMessageDto.safeParse({ type: 'reveal-early' }).success).toBe(true);
    expect(ClientMessageDto.safeParse({ type: 'move-on', fromPosition: 0 }).success).toBe(true);
    expect(ClientMessageDto.safeParse({ type: 'move-on', fromPosition: -1 }).success).toBe(false);
    expect(ClientMessageDto.safeParse({ type: 'leave-room' }).success).toBe(true);
    expect(
      ClientMessageDto.safeParse({ type: 'skip-dilemma', dilemmaId: 'dilemma-1' }).success,
    ).toBe(true);
    expect(
      ClientMessageDto.safeParse({
        type: 'report-dilemma',
        dilemmaId: 'dilemma-1',
        reason: 'offensive',
        comment: 'It names a real person',
      }).success,
    ).toBe(true);
  });

  it('should reject a report without a reason Moderation knows, or with a comment too long', () => {
    // Arrange
    const report = { type: 'report-dilemma', dilemmaId: 'dilemma-1', reason: 'confusing' };

    // Act & Assert
    expect(ReportDilemmaDto.safeParse({ ...report, reason: 'boring' }).success).toBe(false);
    expect(ReportDilemmaDto.safeParse({ ...report, comment: 'x'.repeat(281) }).success).toBe(false);
  });
});
