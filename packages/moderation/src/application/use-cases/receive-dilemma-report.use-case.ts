import { DilemmaReport } from '../../domain/entities/dilemma-report.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { ReportReason } from '../../domain/vos/report-reason.vo.ts';
import type { DilemmaReportRepository } from '../ports/dilemma-report-repository.port.ts';

export interface ReceiveDilemmaReportInput {
  readonly dilemmaId: string;
  readonly version: number;
  readonly reason: ReportReason;
  readonly comment: string | null;
  readonly identity: string;
  readonly reportedAt: Date;
}

/** How another context hands Moderation the report of a dilemma. */
export interface ReceiveDilemmaReport {
  execute(input: ReceiveDilemmaReportInput): Promise<void>;
}

/** Moderation receives the report a player made of a dilemma, and keeps it. */
export class ReceiveDilemmaReportUseCase implements ReceiveDilemmaReport {
  readonly #repository: DilemmaReportRepository;
  readonly #idGenerator: IdGenerator;

  constructor(repository: DilemmaReportRepository, idGenerator: IdGenerator) {
    this.#repository = repository;
    this.#idGenerator = idGenerator;
  }

  async execute(input: ReceiveDilemmaReportInput): Promise<void> {
    await this.#repository.save(
      DilemmaReport.receive({ id: this.#idGenerator.generate(), ...input }),
    );
  }
}
