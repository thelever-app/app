import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { hasReaction } from '../reveal/optimistic.ts';
import { useGame } from '../room/room-provider.tsx';
import { REVEAL_INTRO_MS, RevealIntro } from '../reveal/reveal-intro.tsx';
import { RevealScreen } from '../reveal/reveal-screen.tsx';
import { HOME_PATH } from '../home-path.ts';

/**
 * The reveal of a round, after a brief passage from its decision: any player takes everyone on to
 * the next one and, from the last one, to the game results.
 */
export function RevealPhase({ onShowQr }: { readonly onShowQr: () => void }) {
  const navigate = useNavigate();
  const { game, send, request } = useGame();
  const { reveal } = game;
  const { position } = game.round;

  // The passage shows once for each reveal the screen gets.
  const [introFor, setIntroFor] = useState<number | undefined>(position);
  const [seenPosition, setSeenPosition] = useState(position);
  if (position !== seenPosition) {
    setSeenPosition(position);
    setIntroFor(position);
  }
  useEffect(() => {
    if (introFor === undefined) return;
    const hide = setTimeout(() => setIntroFor(undefined), REVEAL_INTRO_MS);
    return () => clearTimeout(hide);
  }, [introFor]);

  if (!reveal) return null;
  if (introFor === position) return <RevealIntro />;
  const isLast = position === game.dilemmas.length - 1;
  return (
    <RevealScreen
      // A new screen for each reveal, so nothing of the previous one stays.
      key={position}
      game={game}
      reveal={reveal}
      onShowQr={onShowQr}
      onMoveOn={() => send({ type: 'move-on', fromPosition: position })}
      isLast={isLast}
      onLeave={() => {
        send({ type: 'leave-room' });
        void navigate(HOME_PATH);
      }}
      // Each one waits for the state with the like or the reaction of the player, or another round.
      onLike={() =>
        request(
          { type: 'like-dilemma', position },
          (next) => next.reveal?.position !== position || next.reveal.youLiked,
        )
      }
      onReact={(target, emoji) =>
        request(
          { type: 'react', position, target, emoji },
          (next) =>
            next.reveal?.position !== position ||
            hasReaction(next.reveal.yourReactions, target, emoji),
        )
      }
    />
  );
}
