import type { AnswerDilemmaUseCase } from '@thelever-app/game';
import { describe, expect, it } from 'vitest';
import { KeyedLock } from '../../../concurrency/keyed-lock.ts';
import { AnswerDilemmaHandler } from '../../../rooms/sockets/answer-dilemma.handler.ts';
import type { GameStateSender } from '../../../rooms/sockets/game-state-sender.ts';
import type { RoomConnection } from '../../../rooms/sockets/room-connection.ts';

const SESSION = {
  gameId: 'TestGameId',
  playerId: 'TestAnaId',
  connectionId: 'TestConnectionId',
  language: 'es',
} as const;

describe('AnswerDilemmaHandler', () => {
  it('should let the next command of the game in while it sends the answerer a fresh state', async () => {
    // Arrange
    const gameLock = new KeyedLock();
    let lockFreeWhileSending: boolean | undefined;
    const stateSender = {
      async send() {
        const entered = await Promise.race([
          gameLock.acquire(SESSION.gameId).then((release) => {
            release();
            return true;
          }),
          new Promise<false>((resolve) => setTimeout(() => resolve(false), 50)),
        ]);
        lockFreeWhileSending = entered;
      },
    } as unknown as GameStateSender;
    const answerDilemma = { execute: async () => {} } as unknown as AnswerDilemmaUseCase;
    const handler = new AnswerDilemmaHandler(answerDilemma, gameLock, stateSender, (command) =>
      command(),
    );

    // Act
    await handler.handle(
      { type: 'answer-dilemma', dilemmaId: 'TestDilemmaId', vote: 'TestOptionId' },
      { session: SESSION } as unknown as RoomConnection,
    );

    // Assert
    expect(lockFreeWhileSending).toBe(true);
  });
});
