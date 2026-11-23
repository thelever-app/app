import { NicknameReport } from '../../domain/entities/nickname-report.ts';
import type { NicknameReportReason } from '../../domain/vos/report-reason.vo.ts';
import { type ReceivePorts, receiveEntry } from './receive-entry.ts';

export interface ReceiveNicknameReportInput {
  readonly nickname: string;
  /** Who goes by it. */
  readonly owner: string;
  readonly reason: NicknameReportReason;
  readonly comment: string | null;
  /** Who reports it. */
  readonly identity: string;
  readonly reportedAt: Date;
}

/** How another context hands Moderation the report of a nickname. */
export interface ReceiveNicknameReport {
  execute(input: ReceiveNicknameReportInput): Promise<void>;
}

/** Moderation receives the report a player made of the nickname of another, for the team to decide. */
export class ReceiveNicknameReportUseCase implements ReceiveNicknameReport {
  readonly #ports: ReceivePorts;

  constructor(ports: ReceivePorts) {
    this.#ports = ports;
  }

  async execute(input: ReceiveNicknameReportInput): Promise<void> {
    const report = NicknameReport.receive({ id: this.#ports.idGenerator.generate(), ...input });
    await receiveEntry(
      this.#ports,
      { kind: 'nickname', nickname: input.nickname, owner: input.owner },
      report,
      input.reportedAt,
    );
  }
}
