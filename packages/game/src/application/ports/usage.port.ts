/**
 * A fact of use of the game, for the product analytics: never a vote, a prediction, a reaction
 * nor which dilemmas are played.
 */
export type UsageFact =
  | { readonly kind: 'room-created'; readonly identity: string; readonly roomId: string }
  /** Someone joined the room of someone else, not again after leaving it. */
  | { readonly kind: 'room-joined'; readonly identity: string; readonly roomId: string }
  | {
      readonly kind: 'game-started' | 'game-ended';
      /** Who plays it, each once: not who was forgotten, who is tied to nobody. */
      readonly identities: readonly string[];
      /** How many play it, the forgotten ones too. */
      readonly players: number;
      readonly roomId: string;
      readonly gameId: string;
    };

/**
 * Where the facts of use go. What happened is already saved: a fact that cannot be kept must not
 * undo it, so recording one never fails the command.
 */
export interface Usage {
  record(fact: UsageFact): Promise<void>;
}
