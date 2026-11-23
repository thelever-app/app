/** Longest value of each part of the origin that is kept: a campaign name, never a whole text. */
const MAX_LENGTH = 64;

export interface VisitOrigin {
  /** `utm_source`, as the posters of the bars say `cartel`. */
  readonly source: string | null;
  /** `utm_campaign`, as `bares`, or the one of each creator. */
  readonly campaign: string | null;
  /** `utm_content`, as the dilemma of a poster. */
  readonly content: string | null;
  /** `ref`, whoever shared the link. */
  readonly ref: string | null;
}

/**
 * Where a first visit came from, as the link it opened says: only these four parameters,
 * in small letters, cut short and with nothing but letters, digits, dots, dashes and underscores.
 * Nothing is kept on the device to know it.
 */
export function visitOriginOf(parameters: {
  readonly source?: string | undefined;
  readonly campaign?: string | undefined;
  readonly content?: string | undefined;
  readonly ref?: string | undefined;
}): VisitOrigin {
  return {
    source: cleaned(parameters.source),
    campaign: cleaned(parameters.campaign),
    content: cleaned(parameters.content),
    ref: cleaned(parameters.ref),
  };
}

function cleaned(value: string | undefined): string | null {
  const kept = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, MAX_LENGTH);
  return kept === '' ? null : kept;
}
