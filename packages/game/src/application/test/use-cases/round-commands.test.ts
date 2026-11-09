import { describe, expect, it } from 'vitest';
import { AnswerDilemmaUseCase } from '../../use-cases/answer-dilemma.use-case.ts';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { DisconnectPlayerUseCase } from '../../use-cases/disconnect-player.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { LeaveRoomUseCase } from '../../use-cases/leave-room.use-case.ts';
import { ReportDilemmaUseCase } from '../../use-cases/report-dilemma.use-case.ts';
import { RunOutTotalTimeUseCase } from '../../use-cases/run-out-total-time.use-case.ts';
import { SkipDilemmaUseCase } from '../../use-cases/skip-dilemma.use-case.ts';
import { StartRevealUseCase } from '../../use-cases/start-reveal.use-case.ts';
import { InvalidReportReasonError } from '../../errors/invalid-report-reason.error.ts';
import { NotHostError } from '../../../domain/errors/not-host.error.ts';
import { HostChangedEvent } from '../../../domain/events/host-changed.event.ts';
import { RevealStartedEvent } from '../../../domain/events/reveal-started.event.ts';
import { TotalTimeRanOutEvent } from '../../../domain/events/total-time-ran-out.event.ts';
import { InMemoryDilemmaReports } from '../../../adapters/in-memory/in-memory-dilemma-reports.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { InMemorySealProvider } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { gameInDecisionPhase } from '../support/game-in-decision-phase.ts';

const MINUTE = 60_000;

/** Ana hosts Luis and Marta in an anonymous game, all three connected. */
async function arrange() {
  const notifier = new InMemoryPlayerNotifier();
  const game = await gameInDecisionPhase(notifier);
  const ports = {
    roomRepository: game.roomRepository,
    gameRepository: game.gameRepository,
    notifier,
    clock: game.clock,
  };
  const reports = new InMemoryDilemmaReports();
  const connectPlayer = new ConnectPlayerUseCase(game.roomRepository, notifier, game.idGenerator);
  const connections = new Map<string, string>();
  for (const [name, playerId] of [
    ['Ana', game.anaId],
    ['Luis', game.luisId],
    ['Marta', game.martaId],
  ] as const) {
    const { connectionId } = await connectPlayer.execute({
      roomId: game.roomId,
      identity: `Test${name}Identity`,
    });
    connections.set(playerId, connectionId);
  }
  return {
    ...game,
    notifier,
    reports,
    connections,
    connectPlayer,
    answerDilemma: new AnswerDilemmaUseCase({ ...ports, sealProvider: new InMemorySealProvider() }),
    startReveal: new StartRevealUseCase(game.roomRepository, game.gameRepository, notifier),
    runOutTotalTime: new RunOutTotalTimeUseCase(
      game.roomRepository,
      game.gameRepository,
      notifier,
      game.clock,
    ),
    leaveRoom: new LeaveRoomUseCase(game.roomRepository, game.gameRepository, notifier),
    reportDilemma: new ReportDilemmaUseCase({ ...ports, reports }),
    skipDilemma: new SkipDilemmaUseCase(ports),
    disconnectPlayer: new DisconnectPlayerUseCase(
      game.roomRepository,
      game.gameRepository,
      notifier,
    ),
    joinRoom: new JoinRoomUseCase({
      ...ports,
      idGenerator: game.idGenerator,
      randomness: game.randomness,
    }),
  };
}

async function finish(
  { answerDilemma, roomId, dilemmaIds }: Awaited<ReturnType<typeof arrange>>,
  playerId: string,
): Promise<void> {
  for (const dilemmaId of dilemmaIds) {
    await answerDilemma.execute({ roomId, playerId, dilemmaId, vote: 'TestOption' });
  }
}

describe('Decision phase commands', () => {
  describe('StartRevealUseCase', () => {
    it('should let the host move the game to the reveal and tell everyone', async () => {
      // Arrange
      const { startReveal, gameRepository, notifier, roomId, gameId, anaId, martaId } =
        await arrange();

      // Act
      await startReveal.execute({ roomId, playerId: anaId });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.phase).toBe('reveal');
      expect(game?.didNotVoteOf(martaId)).toHaveLength(3);
      expect(notifier.receivedBy(martaId).at(-1)).toBeInstanceOf(RevealStartedEvent);
    });

    it('should not let anyone else start it', async () => {
      // Arrange
      const { startReveal, roomId, luisId } = await arrange();

      // Act & Assert
      await expect(startReveal.execute({ roomId, playerId: luisId })).rejects.toThrow(NotHostError);
    });
  });

  describe('RunOutTotalTimeUseCase', () => {
    it('should do nothing before the total time is over', async () => {
      // Arrange
      const { runOutTotalTime, gameRepository, clock, roomId, gameId } = await arrange();
      clock.advance(6 * MINUTE - 1);

      // Act
      await runOutTotalTime.execute({ roomId });

      // Assert
      expect((await gameRepository.findById(gameId))?.totalTimeRanOut).toBe(false);
    });

    it('should tell everyone who has not finished, and pass the role of an away host', async () => {
      // Arrange
      const arranged = await arrange();
      const { runOutTotalTime, disconnectPlayer, roomRepository, notifier, clock, connections } =
        arranged;
      const { roomId, anaId, luisId, martaId } = arranged;
      await finish(arranged, luisId);
      await disconnectPlayer.execute({
        roomId,
        playerId: anaId,
        connectionId: connections.get(anaId)!,
      });
      clock.advance(6 * MINUTE);

      // Act
      await runOutTotalTime.execute({ roomId });

      // Assert
      const received = notifier.receivedBy(martaId);
      expect(received.find((event) => event instanceof TotalTimeRanOutEvent)).toMatchObject({
        stragglerIds: [anaId, martaId],
      });
      expect(received).toContainEqual(new HostChangedEvent(roomId, luisId, expect.any(Number)));
      expect((await roomRepository.findById(roomId))?.host.id).toBe(luisId);
    });
  });

  describe('AnswerDilemmaUseCase', () => {
    it('should pass the role of a disconnected host when everyone else has finished', async () => {
      // Arrange
      const arranged = await arrange();
      const { disconnectPlayer, roomRepository, connections, roomId, anaId, luisId, martaId } =
        arranged;
      await disconnectPlayer.execute({
        roomId,
        playerId: anaId,
        connectionId: connections.get(anaId)!,
      });
      await finish(arranged, luisId);

      // Act
      await finish(arranged, martaId);

      // Assert
      expect((await roomRepository.findById(roomId))?.host.id).toBe(luisId);
    });

    it('should move the game to the reveal when everyone has finished', async () => {
      // Arrange
      const arranged = await arrange();
      const { gameRepository, gameId, anaId, luisId, martaId } = arranged;
      await finish(arranged, anaId);
      await finish(arranged, luisId);

      // Act
      await finish(arranged, martaId);

      // Assert
      expect((await gameRepository.findById(gameId))?.phase).toBe('reveal');
    });

    it('should find the total time over before taking a late answer', async () => {
      // Arrange
      const { answerDilemma, gameRepository, clock, roomId, gameId, luisId, dilemmaIds } =
        await arrange();
      clock.advance(7 * MINUTE);

      // Act
      await answerDilemma.execute({
        roomId,
        playerId: luisId,
        dilemmaId: dilemmaIds[0]!,
        vote: 'TestOption',
      });

      // Assert
      expect((await gameRepository.findById(gameId))?.totalTimeRanOut).toBe(true);
    });
  });

  describe('LeaveRoomUseCase and JoinRoomUseCase', () => {
    it('should pass the role of a host who leaves, and bring them back as a player', async () => {
      // Arrange
      const { leaveRoom, joinRoom, roomRepository, gameRepository, roomId, gameId, anaId, luisId } =
        await arrange();

      // Act
      await leaveRoom.execute({ roomId, playerId: anaId });
      await joinRoom.execute({ roomId, nickname: 'Ana', identity: 'TestAnaIdentity' });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.host.id).toBe(luisId);
      expect(room?.hasLeft(anaId)).toBe(false);
      expect((await gameRepository.findById(gameId))?.hasLeft(anaId)).toBe(false);
    });
  });

  describe('ReportDilemmaUseCase', () => {
    it('should hand the report to Moderation and let an offensive dilemma be skipped', async () => {
      // Arrange
      const {
        reportDilemma,
        skipDilemma,
        reports,
        gameRepository,
        roomId,
        gameId,
        luisId,
        dilemmaIds,
      } = await arrange();

      // Act
      await reportDilemma.execute({
        roomId,
        playerId: luisId,
        dilemmaId: dilemmaIds[0]!,
        reason: 'offensive',
        comment: '  ',
      });

      // Assert
      expect(reports.reports).toEqual([
        {
          dilemmaId: dilemmaIds[0],
          version: 1,
          reason: 'offensive',
          comment: null,
          identity: 'TestLuisIdentity',
        },
      ]);
      await skipDilemma.execute({ roomId, playerId: luisId, dilemmaId: dilemmaIds[0]! });
      const game = await gameRepository.findById(gameId);
      expect(game?.reportsOf(luisId)).toEqual([{ dilemmaId: dilemmaIds[0], offensive: true }]);
      expect(game?.didNotVoteOf(luisId)).toEqual([
        { dilemmaId: dilemmaIds[0], reason: 'reported' },
      ]);
    });

    it('should not skip a dilemma reported for another reason', async () => {
      // Arrange
      const { reportDilemma, gameRepository, roomId, gameId, luisId, dilemmaIds } = await arrange();

      // Act
      await reportDilemma.execute({
        roomId,
        playerId: luisId,
        dilemmaId: dilemmaIds[0]!,
        reason: 'confusing',
        comment: 'TestComment',
      });

      // Assert
      expect((await gameRepository.findById(gameId))?.progressOf(luisId)).toBe(0);
    });

    it('should throw an error for a reason Moderation does not know', async () => {
      // Arrange
      const { reportDilemma, roomId, luisId, dilemmaIds } = await arrange();

      // Act & Assert
      await expect(
        reportDilemma.execute({
          roomId,
          playerId: luisId,
          dilemmaId: dilemmaIds[0]!,
          reason: 'boring',
        }),
      ).rejects.toThrow(InvalidReportReasonError);
    });
  });
});
