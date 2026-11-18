/**
 * The types of dilemma, as Dilemmas classifies them: a game spaces those that are not standard, so
 * two of a kind never come one after the other.
 */
export const DILEMMA_TYPES = ['standard', 'game-theory', 'would-you-rather'] as const;

export type DilemmaType = (typeof DILEMMA_TYPES)[number];

/** How much is at stake in a dilemma, as Dilemmas classifies it: a game spaces the extreme ones. */
export const SCALES = ['everyday', 'medium', 'extreme'] as const;

export type Scale = (typeof SCALES)[number];

/**
 * A dilemma a game may play, as putting it together needs to know it: how to space it and whether
 * it has the gap.
 */
export interface CandidateDilemma {
  readonly dilemmaId: string;
  readonly type: DilemmaType;
  readonly scale: Scale;
  readonly minimumAge: 16 | 18;
  /** Whether a player of the room takes the place of "someone in the group" in it. */
  readonly hasGap: boolean;
}
