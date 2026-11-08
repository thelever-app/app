import { PlayerNotInRoomError } from '../../domain/errors/player-not-in-room.error.ts';
import { DilemmaNotInGameError } from '../../domain/errors/dilemma-not-in-game.error.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import { InvalidReportReasonError } from '../errors/invalid-report-reason.error.ts';
import {
  REPORT_REASONS,
  type DilemmaReports,
  type ReportReason,
} from '../ports/dilemma-reports.port.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findCurrentGame } from './find-current-game.ts';
import { notifyGame } from './notify-game.ts';

export interface ReportDilemmaInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly dilemmaId: string;
  readonly reason: string;
  readonly comment?: string | null;
}

/**
 * A player reports a dilemma of the game to Moderation, once. Reported as offensive, they may
 * then skip it.
 */
export class ReportDilemmaUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #reports: DilemmaReports;
  readonly #notifier: PlayerNotifier;
  readonly #clock: Clock;

  constructor(ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly reports: DilemmaReports;
    readonly notifier: PlayerNotifier;
    readonly clock: Clock;
  }) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#reports = ports.reports;
    this.#notifier = ports.notifier;
    this.#clock = ports.clock;
  }

  async execute({
    roomId,
    playerId,
    dilemmaId,
    reason,
    comment,
  }: ReportDilemmaInput): Promise<void> {
    if (!(REPORT_REASONS as readonly string[]).includes(reason)) {
      throw new InvalidReportReasonError(reason);
    }
    const { room, game } = await findCurrentGame(
      this.#roomRepository,
      this.#gameRepository,
      roomId,
    );
    const player = room.players.find(({ id }) => id === playerId);
    if (!player) throw new PlayerNotInRoomError(playerId);
    const dilemma = game.dilemmas.find((played) => played.dilemmaId === dilemmaId);
    if (!dilemma) throw new DilemmaNotInGameError(dilemmaId);

    const at = this.#clock.now();
    game.runOutTotalTime(at);
    game.recordReport(playerId, dilemmaId, reason === 'offensive');
    handOverHostIfAway(room, game);
    const gameEvents = game.pullEvents();
    const roomEvents = room.pullEvents();
    await this.#gameRepository.save(game);
    if (roomEvents.length > 0) await this.#roomRepository.save(room);
    await this.#reports.report({
      dilemmaId,
      version: dilemma.version,
      reason: reason as ReportReason,
      comment: comment?.trim() || null,
      identity: player.identity,
    });

    await notifyGame({ room, game }, { roomEvents, gameEvents }, this.#notifier);
  }
}
