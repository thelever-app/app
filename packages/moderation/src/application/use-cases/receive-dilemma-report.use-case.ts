import { DilemmaReport } from '../../domain/entities/dilemma-report.ts';
import type { Language } from '../../domain/vos/language.vo.ts';
import type { DilemmaReportReason } from '../../domain/vos/report-reason.vo.ts';
import { type ReceivePorts, receiveEntry } from './receive-entry.ts';

export interface ReceiveDilemmaReportInput {
  readonly dilemmaId: string;
  readonly version: number;
  readonly reason: DilemmaReportReason;
  readonly comment: string | null;
  readonly language: Language;
  readonly identity: string;
  readonly reportedAt: Date;
}

/** How another context hands Moderation the report of a dilemma. */
export interface ReceiveDilemmaReport {
  execute(input: ReceiveDilemmaReportInput): Promise<void>;
}

/**
 * Moderation receives the report a player made of a dilemma: on the issue of the dilemma, which
 * the third player to report it hides from new games.
 */
export class ReceiveDilemmaReportUseCase implements ReceiveDilemmaReport {
  readonly #ports: ReceivePorts;

  constructor(ports: ReceivePorts) {
    this.#ports = ports;
  }

  async execute(input: ReceiveDilemmaReportInput): Promise<void> {
    const report = DilemmaReport.receive({ id: this.#ports.idGenerator.generate(), ...input });
    await receiveEntry(
      this.#ports,
      { kind: 'dilemma', dilemmaId: input.dilemmaId },
      report,
      input.reportedAt,
    );
  }
}
