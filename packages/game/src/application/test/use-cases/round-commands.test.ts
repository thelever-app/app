import { describe, expect, it } from 'vitest';
import { AnswerDilemmaUseCase } from '../../use-cases/answer-dilemma.use-case.ts';
import { ConnectPlayerUseCase } from '../../use-cases/connect-player.use-case.ts';
import { DisconnectPlayerUseCase } from '../../use-cases/disconnect-player.use-case.ts';
import { JoinRoomUseCase } from '../../use-cases/join-room.use-case.ts';
import { LeaveRoomUseCase } from '../../use-cases/leave-room.use-case.ts';
import { ReportDilemmaUseCase } from '../../use-cases/report-dilemma.use-case.ts';
import { GetReadyToMoveOnUseCase } from '../../use-cases/get-ready-to-move-on.use-case.ts';
import { MoveOnUseCase } from '../../use-cases/move-on.use-case.ts';
import { RevealEarlyUseCase } from '../../use-cases/reveal-early.use-case.ts';
import { RunOutRoundUseCase } from '../../use-cases/run-out-round.use-case.ts';
import { SkipDilemmaUseCase } from '../../use-cases/skip-dilemma.use-case.ts';
import { InvalidReportReasonError } from '../../errors/invalid-report-reason.error.ts';
import { InvalidReportLanguageError } from '../../errors/invalid-report-language.error.ts';
import { NotHostError } from '../../../domain/errors/not-host.error.ts';
import { HostChangedEvent } from '../../../domain/events/host-changed.event.ts';
import { DilemmaRevealedEvent } from '../../../domain/events/dilemma-revealed.event.ts';
import { ReadyToMoveOnChangedEvent } from '../../../domain/events/ready-to-move-on-changed.event.ts';
import { RoundStartedEvent } from '../../../domain/events/round-started.event.ts';
import { InMemoryDilemmaReports } from '../../../adapters/in-memory/in-memory-dilemma-reports.ts';
import { InMemoryPlayerNotifier } from '../../../adapters/in-memory/in-memory-player-notifier.ts';
import { InMemorySealProvider } from '../../../adapters/in-memory/in-memory-seal-provider.ts';
import { gameInDecisionPhase } from '../support/game-in-decision-phase.ts';

/** The time per dilemma of the room: a minute. */
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
  const connectPlayer = new ConnectPlayerUseCase(
    game.roomRepository,
    game.gameRepository,
    notifier,
    game.idGenerator,
    game.clock,
  );
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
    answerDilemma: new AnswerDilemmaUseCase({
      ...ports,
      sealProvider: new InMemorySealProvider(),
      dilemmaCatalog: game.catalog,
    }),
    revealEarly: new RevealEarlyUseCase(
      game.roomRepository,
      game.gameRepository,
      notifier,
      game.clock,
    ),
    runOutRound: new RunOutRoundUseCase(
      game.roomRepository,
      game.gameRepository,
      notifier,
      game.clock,
    ),
    moveOn: new MoveOnUseCase(game.roomRepository, game.gameRepository, notifier, game.clock),
    getReadyToMoveOn: new GetReadyToMoveOnUseCase(
      game.roomRepository,
      game.gameRepository,
      notifier,
      game.clock,
    ),
    leaveRoom: new LeaveRoomUseCase(game.roomRepository, game.gameRepository, notifier, game.clock),
    reportDilemma: new ReportDilemmaUseCase({ ...ports, reports }),
    skipDilemma: new SkipDilemmaUseCase(ports),
    disconnectPlayer: new DisconnectPlayerUseCase(
      game.roomRepository,
      game.gameRepository,
      notifier,
      game.clock,
    ),
    joinRoom: new JoinRoomUseCase({
      sealProvider: new InMemorySealProvider(),
      ...ports,
      idGenerator: game.idGenerator,
      randomness: game.randomness,
    }),
  };
}

/** Each player votes the dilemma of the round, in the order given. */
async function vote(
  { answerDilemma, roomId, dilemmaIds }: Awaited<ReturnType<typeof arrange>>,
  position: number,
  ...playerIds: string[]
): Promise<void> {
  for (const playerId of playerIds) {
    await answerDilemma.execute({
      language: 'es',
      roomId,
      playerId,
      dilemmaId: dilemmaIds[position]!,
      vote: 'TestOption',
      ready: true,
    });
  }
}

describe('Round commands', () => {
  describe('AnswerDilemmaUseCase', () => {
    it('should reveal the dilemma once everyone connected has answered, and tell everyone', async () => {
      // Arrange
      const arranged = await arrange();
      const { gameRepository, notifier, gameId, anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId);

      // Act
      await vote(arranged, 0, martaId);

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.round).toMatchObject({ position: 0, phase: 'reveal', revealedBy: 'everyone' });
      expect(notifier.receivedBy(anaId).at(-1)).toBeInstanceOf(DilemmaRevealedEvent);
    });

    it('should reveal the dilemma whose time is over and drop an answer that comes after it', async () => {
      // Arrange
      const arranged = await arrange();
      const { answerDilemma, gameRepository, notifier, clock, roomId, gameId } = arranged;
      const { anaId, luisId, dilemmaIds } = arranged;
      clock.advance(MINUTE);

      // Act
      await answerDilemma.execute({
        language: 'es',
        roomId,
        playerId: luisId,
        dilemmaId: dilemmaIds[0]!,
        vote: 'TestOption',
        ready: true,
      });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.round).toMatchObject({ phase: 'reveal', revealedBy: 'time' });
      expect(game?.didNotVoteOf(luisId)).toEqual([
        { dilemmaId: dilemmaIds[0], reason: 'not-answered' },
      ]);
      expect(notifier.receivedBy(anaId).at(-1)).toBeInstanceOf(DilemmaRevealedEvent);
    });
  });

  describe('DisconnectPlayerUseCase', () => {
    it('should not let the round wait for who disconnects without answering', async () => {
      // Arrange
      const arranged = await arrange();
      const { disconnectPlayer, gameRepository, connections, roomId, gameId } = arranged;
      const { anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId);

      // Act
      await disconnectPlayer.execute({
        roomId,
        playerId: martaId,
        connectionId: connections.get(martaId)!,
      });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.phase).toBe('reveal');
      expect(game?.didNotVoteOf(martaId)).toEqual([
        { dilemmaId: arranged.dilemmaIds[0], reason: 'not-answered' },
      ]);
    });

    it('should reveal by time a dilemma whose time is over when the last one left disconnects', async () => {
      // Arrange
      const arranged = await arrange();
      const { disconnectPlayer, gameRepository, connections, clock, roomId, gameId } = arranged;
      const { anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId);
      clock.advance(MINUTE);

      // Act
      await disconnectPlayer.execute({
        roomId,
        playerId: martaId,
        connectionId: connections.get(martaId)!,
      });

      // Assert
      expect((await gameRepository.findById(gameId))?.round?.revealedBy).toBe('time');
    });

    it('should not let the reveal wait for who disconnects without being ready to move on', async () => {
      // Arrange
      const arranged = await arrange();
      const { disconnectPlayer, getReadyToMoveOn, gameRepository, connections, roomId, gameId } =
        arranged;
      const { anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId, martaId);
      for (const playerId of [anaId, luisId]) {
        await getReadyToMoveOn.execute({ roomId, playerId, fromPosition: 0 });
      }

      // Act
      await disconnectPlayer.execute({
        roomId,
        playerId: martaId,
        connectionId: connections.get(martaId)!,
      });

      // Assert
      expect((await gameRepository.findById(gameId))?.round).toMatchObject({
        position: 1,
        movedOnBy: null,
      });
    });

    it('should pass the role of a host who disconnects from the reveal as the last one not ready', async () => {
      // Arrange
      const arranged = await arrange();
      const { disconnectPlayer, getReadyToMoveOn, gameRepository, roomRepository, connections } =
        arranged;
      const { roomId, gameId, anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId, martaId);
      for (const playerId of [luisId, martaId]) {
        await getReadyToMoveOn.execute({ roomId, playerId, fromPosition: 0 });
      }

      // Act
      await disconnectPlayer.execute({
        roomId,
        playerId: anaId,
        connectionId: connections.get(anaId)!,
      });

      // Assert
      expect((await gameRepository.findById(gameId))?.round?.position).toBe(1);
      expect((await roomRepository.findById(roomId))?.host.id).toBe(luisId);
    });
  });

  describe('RunOutRoundUseCase', () => {
    it('should do nothing before the time for the dilemma is over', async () => {
      // Arrange
      const { runOutRound, gameRepository, clock, roomId, gameId } = await arrange();
      clock.advance(MINUTE - 1);

      // Act
      await runOutRound.execute({ roomId });

      // Assert
      expect((await gameRepository.findById(gameId))?.isInDecisionPhase).toBe(true);
    });

    it('should reveal the dilemma once its time is over, and pass the role of an away host', async () => {
      // Arrange
      const arranged = await arrange();
      const { runOutRound, disconnectPlayer, roomRepository, notifier, clock, connections } =
        arranged;
      const { roomId, anaId, luisId, martaId } = arranged;
      await disconnectPlayer.execute({
        roomId,
        playerId: anaId,
        connectionId: connections.get(anaId)!,
      });
      clock.advance(MINUTE);

      // Act
      await runOutRound.execute({ roomId });

      // Assert
      const received = notifier.receivedBy(martaId);
      expect(received.some((event) => event instanceof DilemmaRevealedEvent)).toBe(true);
      expect(received).toContainEqual(new HostChangedEvent(roomId, luisId, expect.any(Number)));
      expect((await roomRepository.findById(roomId))?.host.id).toBe(luisId);
    });
  });

  describe('RevealEarlyUseCase', () => {
    it('should let the host reveal the dilemma early and tell everyone', async () => {
      // Arrange
      const { revealEarly, gameRepository, notifier, roomId, gameId, anaId, martaId } =
        await arrange();

      // Act
      await revealEarly.execute({ roomId, playerId: anaId });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.round?.revealedBy).toBe('host');
      expect(game?.didNotVoteOf(martaId)).toHaveLength(1);
      expect(notifier.receivedBy(martaId).at(-1)).toBeInstanceOf(DilemmaRevealedEvent);
    });

    it('should not let anyone else reveal it', async () => {
      // Arrange
      const { revealEarly, roomId, luisId } = await arrange();

      // Act & Assert
      await expect(revealEarly.execute({ roomId, playerId: luisId })).rejects.toThrow(NotHostError);
    });
  });

  describe('MoveOnUseCase', () => {
    it('should let the host take everyone to the next round without waiting, only once', async () => {
      // Arrange
      const arranged = await arrange();
      const { moveOn, gameRepository, notifier, roomId, gameId, anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId, martaId);

      // Act
      await moveOn.execute({ roomId, playerId: anaId, fromPosition: 0 });
      await moveOn.execute({ roomId, playerId: anaId, fromPosition: 0 });

      // Assert
      const game = await gameRepository.findById(gameId);
      expect(game?.round).toMatchObject({ position: 1, phase: 'decision', movedOnBy: anaId });
      expect(notifier.receivedBy(luisId).at(-1)).toEqual(
        new RoundStartedEvent(gameId, 1, anaId, expect.any(Number)),
      );
    });

    it('should not let anyone else move everyone on', async () => {
      // Arrange
      const arranged = await arrange();
      const { moveOn, roomId, anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId, martaId);

      // Act & Assert
      await expect(moveOn.execute({ roomId, playerId: luisId, fromPosition: 0 })).rejects.toThrow(
        NotHostError,
      );
    });
  });

  describe('GetReadyToMoveOnUseCase', () => {
    it('should tell everyone who is ready, and move everyone on once the last connected one is', async () => {
      // Arrange
      const arranged = await arrange();
      const { getReadyToMoveOn, gameRepository, notifier, roomId, gameId } = arranged;
      const { anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId, martaId);

      // Act
      await getReadyToMoveOn.execute({ roomId, playerId: luisId, fromPosition: 0 });
      const afterLuis = notifier.receivedBy(anaId).at(-1);
      await getReadyToMoveOn.execute({ roomId, playerId: anaId, fromPosition: 0 });
      await getReadyToMoveOn.execute({ roomId, playerId: martaId, fromPosition: 0 });

      // Assert
      expect(afterLuis).toEqual(new ReadyToMoveOnChangedEvent(gameId, expect.any(Number)));
      expect((await gameRepository.findById(gameId))?.round).toMatchObject({
        position: 1,
        movedOnBy: null,
      });
      expect(notifier.receivedBy(luisId).at(-1)).toEqual(
        new RoundStartedEvent(gameId, 1, null, expect.any(Number)),
      );
    });
  });

  describe('LeaveRoomUseCase and JoinRoomUseCase', () => {
    it('should pass the role of a host who leaves, and bring them back as a player', async () => {
      // Arrange
      const { leaveRoom, joinRoom, roomRepository, gameRepository, roomId, gameId, anaId, luisId } =
        await arrange();

      // Act
      await leaveRoom.execute({ roomId, playerId: anaId });
      await joinRoom.execute({
        roomId,
        nickname: 'Ana',
        identity: 'TestAnaIdentity',
        avatar: { face: 'face-01', color: 'khaki' },
      });

      // Assert
      const room = await roomRepository.findById(roomId);
      expect(room?.host.id).toBe(luisId);
      expect(room?.hasLeft(anaId)).toBe(false);
      expect((await gameRepository.findById(gameId))?.hasLeft(anaId)).toBe(false);
    });

    it('should reveal by time a dilemma whose time is over when the last one left leaves', async () => {
      // Arrange
      const arranged = await arrange();
      const { leaveRoom, gameRepository, clock, roomId, gameId, anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId);
      clock.advance(MINUTE);

      // Act
      await leaveRoom.execute({ roomId, playerId: martaId });

      // Assert
      expect((await gameRepository.findById(gameId))?.round?.revealedBy).toBe('time');
    });

    it('should not let the reveal wait for who leaves without being ready to move on', async () => {
      // Arrange
      const arranged = await arrange();
      const { leaveRoom, getReadyToMoveOn, gameRepository, roomId, gameId } = arranged;
      const { anaId, luisId, martaId } = arranged;
      await vote(arranged, 0, anaId, luisId, martaId);
      for (const playerId of [anaId, luisId]) {
        await getReadyToMoveOn.execute({ roomId, playerId, fromPosition: 0 });
      }

      // Act
      await leaveRoom.execute({ roomId, playerId: martaId });

      // Assert
      expect((await gameRepository.findById(gameId))?.round?.position).toBe(1);
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
        clock,
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
        language: 'fr',
      });

      // Assert
      expect(reports.reports).toEqual([
        {
          dilemmaId: dilemmaIds[0],
          version: 1,
          reason: 'offensive',
          comment: null,
          language: 'fr',
          identity: 'TestLuisIdentity',
          at: clock.now(),
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
        language: 'es',
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
          language: 'es',
        }),
      ).rejects.toThrow(InvalidReportReasonError);
    });

    it('should throw an error for a language the app does not have', async () => {
      // Arrange
      const { reportDilemma, roomId, luisId, dilemmaIds } = await arrange();

      // Act & Assert
      await expect(
        reportDilemma.execute({
          roomId,
          playerId: luisId,
          dilemmaId: dilemmaIds[0]!,
          reason: 'confusing',
          language: 'ja',
        }),
      ).rejects.toThrow(InvalidReportLanguageError);
    });

    it('should take a dilemma reported as possibly illegal', async () => {
      // Arrange
      const { reportDilemma, reports, roomId, luisId, dilemmaIds } = await arrange();

      // Act
      await reportDilemma.execute({
        roomId,
        playerId: luisId,
        dilemmaId: dilemmaIds[0]!,
        reason: 'illegal',
        language: 'es',
      });

      // Assert
      expect(reports.reports.map(({ reason }) => reason)).toEqual(['illegal']);
    });
  });
});
