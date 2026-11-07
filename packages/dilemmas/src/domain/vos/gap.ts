/**
 * Where a dilemma has the gap "someone in the group": in its text or its options, in every language,
 * kept as it is and never translated. Writers see it as «{alguien del grupo}».
 */
export const GAP_MARKER = '{gap}';

/** Whether the text of a dilemma or of any of its options has the gap. */
export function hasGap(texts: readonly string[]): boolean {
  return texts.some((text) => text.includes(GAP_MARKER));
}
