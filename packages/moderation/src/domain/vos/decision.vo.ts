import type { Language } from './language.vo.ts';

/** What the team decides on an issue: the content leaves the catalog or the room, or stays. */
export const OUTCOMES = ['withdrawn', 'kept'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/**
 * The decision of a person of the team (glossary, «Revisión humana»), with the facts and the rule of
 * the terms of use that the statement of reasons shows.
 */
export interface Decision {
  readonly outcome: Outcome;
  /** What the team saw, without personal data, as the team wrote it. */
  readonly facts: string;
  /** The facts in every language of the app, for whoever reads the decision in theirs. */
  readonly translatedFacts: Readonly<Record<Language, string>>;
  /** The section of the terms of use, such as 4.2. */
  readonly rule: string;
  readonly decidedAt: Date;
}
