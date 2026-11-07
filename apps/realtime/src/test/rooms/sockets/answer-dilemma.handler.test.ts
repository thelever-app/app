import type { AnswerDilemmaUseCase } from '@thelever-app/game';
import { describe, expect, it } from 'vitest';
import { KeyedLock } from '../../../concurrency/keyed-lock.ts';
import { AnswerDilemmaHandler } from '../../../rooms/sockets/answer-dilemma.handler.ts';
import type { StateSender } from '../../../rooms/sockets/state-sender.ts';
import type { RoomConnection } from '../../../rooms/sockets/room-connection.ts';

const SESSION = {
  roomId: 'TestRoomId',
  playerId: 'TestAnaId',
  connectionId: 'TestConnectionId',
  language: 'es',
} as const;

describe('AnswerDilemmaHandler', () => {
  // Each later change reaches the answerer as a delta, which the screen applies only on top of a
  // state that already has their own answer: the state must leave before anything newer exists.
  it('should send the answerer a fresh state before the next command of the room gets in', async () => {
    // Arrange
    const roomLock = new KeyedLock();
    let lockFreeWhileSending: boolean | undefined;
    const stateSender = {
      async send() {
        const entered = await Promise.race([
          roomLock.acquire(SESSION.roomId).then((release) => {
            release();
            return true;
          }),
          new Promise<false>((resolve) => setTimeout(() => resolve(false), 50)),
        ]);
        lockFreeWhileSending = entered;
      },
    } as unknown as StateSender;
    const answerDilemma = { execute: async () => {} } as unknown as AnswerDilemmaUseCase;
    const handler = new AnswerDilemmaHandler(answerDilemma, roomLock, stateSender, (command) =>
      command(),
    );

    // Act
    await handler.handle(
      { type: 'answer-dilemma', dilemmaId: 'TestDilemmaId', vote: 'TestOptionId' },
      { session: SESSION } as unknown as RoomConnection,
    );

    // Assert
    expect(lockFreeWhileSending).toBe(false);
  });
});
