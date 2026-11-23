import type { AnalyticsObjectionRepository } from '../ports/analytics-objection-repository.port.ts';

/** Whether an identity objects to product analytics: then nothing of theirs is counted. */
export interface ObjectsToAnalytics {
  execute(identity: string): Promise<boolean>;
}

export class ObjectsToAnalyticsUseCase implements ObjectsToAnalytics {
  readonly #objections: AnalyticsObjectionRepository;

  constructor(objections: AnalyticsObjectionRepository) {
    this.#objections = objections;
  }

  async execute(identity: string): Promise<boolean> {
    return (await this.#objections.objectedAt(identity)) !== undefined;
  }
}
