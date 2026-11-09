import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../room/room-provider.tsx';
import { REVEAL_INTRO_MS, RevealIntro } from '../reveal/reveal-intro.tsx';
import { RevealScreen } from '../reveal/reveal-screen.tsx';

/**
 * The reveal of a round, after a brief passage from its decision: any player takes everyone on to
 * the next one, until the last.
 */
export function RevealPhase() {
  const navigate = useNavigate();
  const { game, send } = useGame();
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
  if (introFor === position) return <RevealIntro game={game} />;
  const isLast = position === game.dilemmas.length - 1;
  return (
    <RevealScreen
      // A new screen for each reveal, so nothing of the previous one stays.
      key={position}
      game={game}
      reveal={reveal}
      onMoveOn={isLast ? undefined : () => send({ type: 'move-on', fromPosition: position })}
      onLeave={() => {
        send({ type: 'leave-room' });
        void navigate('/');
      }}
    />
  );
}
