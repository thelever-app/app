/**
 * What an issue is about: a dilemma, the nickname a player goes by, or what a notice points to
 * when it names no dilemma, such as a room and a nickname, as its sender wrote it.
 */
export type IssueContent =
  | { readonly kind: 'dilemma'; readonly dilemmaId: string }
  /** The owner is null once their data are deleted. */
  | { readonly kind: 'nickname'; readonly nickname: string; readonly owner: string | null }
  | { readonly kind: 'reference'; readonly reference: string };
