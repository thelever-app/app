import type { GameStateDto } from '@thelever-app/protocol';
import { startTransition, useOptimistic } from 'react';

type Reveal = NonNullable<GameStateDto['reveal']>;
export type YourReactions = Reveal['yourReactions'];
export type ReactionTarget =
  { readonly kind: 'dilemma' } | { readonly kind: 'vote'; readonly playerId: string };

/**
 * «Buen dilema» as the player sees it: marked as soon as they give it, while the server confirms
 * it; then, whatever the server says.
 */
export function useOptimisticLike(
  liked: boolean,
  like: () => Promise<void>,
): readonly [boolean, () => void] {
  const [shown, setShown] = useOptimistic(liked);
  const give = () => {
    startTransition(async () => {
      setShown(true);
      await like();
    });
  };
  return [shown, give];
}

/**
 * The reactions of the player as they see them: the new one at once, in the place of the one before
 * to the same thing, while the server confirms it; then, whatever the server says.
 */
export function useOptimisticReactions(
  yours: YourReactions,
  react: (target: ReactionTarget, emoji: string) => Promise<void>,
): readonly [YourReactions, (target: ReactionTarget, emoji: string) => void] {
  const [shown, addReaction] = useOptimistic(
    yours,
    (current, { target, emoji }: { readonly target: ReactionTarget; readonly emoji: string }) =>
      target.kind === 'dilemma'
        ? { ...current, dilemma: emoji }
        : {
            ...current,
            votes: [
              ...current.votes.filter(({ aboutId }) => aboutId !== target.playerId),
              { aboutId: target.playerId, emoji },
            ],
          },
  );
  const give = (target: ReactionTarget, emoji: string) => {
    startTransition(async () => {
      addReaction({ target, emoji });
      await react(target, emoji);
    });
  };
  return [shown, give];
}

/** Whether the reactions of the player have that emoji on that target, as the server keeps them. */
export function hasReaction(yours: YourReactions, target: ReactionTarget, emoji: string): boolean {
  return target.kind === 'dilemma'
    ? yours.dilemma === emoji
    : yours.votes.some((vote) => vote.aboutId === target.playerId && vote.emoji === emoji);
}

/**
 * The reactions to the dilemma as the screen shows them, with the one of the player as they see it
 * now: out of the emoji it had, into the one they chose.
 */
export function withYourReaction(
  reactions: Reveal['dilemmaReactions'],
  confirmed: string | null,
  shown: string | null,
  selfId: string,
  anonymous: boolean,
): Reveal['dilemmaReactions'] {
  if (confirmed === shown) return reactions;
  const moved = reactions
    .map((reaction) =>
      reaction.emoji === confirmed
        ? {
            ...reaction,
            count: reaction.count - 1,
            playerIds: reaction.playerIds.filter((playerId) => playerId !== selfId),
          }
        : reaction,
    )
    .filter(({ count }) => count > 0);
  if (shown === null) return moved;
  const existing = moved.find(({ emoji }) => emoji === shown);
  const self = anonymous ? [] : [selfId];
  return existing
    ? moved.map((reaction) =>
        reaction === existing
          ? { ...reaction, count: reaction.count + 1, playerIds: [...reaction.playerIds, ...self] }
          : reaction,
      )
    : [...moved, { emoji: shown, count: 1, playerIds: self }];
}
