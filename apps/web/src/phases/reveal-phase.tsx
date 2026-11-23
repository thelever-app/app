import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { deviceLanguage } from '../i18n/i18n.ts';
import { hasReaction } from '../reveal/optimistic.ts';
import { useGame } from '../room/room-provider.tsx';
import { REVEAL_INTRO_MS, RevealIntro } from '../reveal/reveal-intro.tsx';
import { RevealScreen } from '../reveal/reveal-screen.tsx';
import { HOME_PATH } from '../home-path.ts';

/**
 * The reveal of a round, after a brief passage from its decision: once every player is ready, or
 * when the host moves everyone on, everyone goes to the next one and, from the last one, to the
 * game results.
 */
export function RevealPhase({ onShowQr }: { readonly onShowQr: () => void }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
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
  if (introFor === position) return <RevealIntro game={game} reveal={reveal} />;
  const isLast = position === game.dilemmas.length - 1;
  const isHost = game.hostId === game.playerId;
  return (
    <RevealScreen
      // A new screen for each reveal, so nothing of the previous one stays.
      key={position}
      game={game}
      reveal={reveal}
      onShowQr={onShowQr}
      onRestart={isHost ? () => send({ type: 'restart-game' }) : undefined}
      onReady={() => send({ type: 'ready-to-move-on', fromPosition: position })}
      onMoveEveryoneOn={
        isHost ? () => send({ type: 'move-on', fromPosition: position }) : undefined
      }
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
      onUnlike={() =>
        request(
          { type: 'unlike-dilemma', position },
          (next) => next.reveal?.position !== position || !next.reveal.youLiked,
        )
      }
      onReport={(reason, comment) =>
        send({
          type: 'report-dilemma',
          dilemmaId: reveal.dilemmaId,
          reason,
          language: deviceLanguage(i18n),
          ...(comment.trim() && { comment: comment.trim() }),
        })
      }
      onReportNickname={(playerId, reason, comment) =>
        send({
          type: 'report-nickname',
          playerId,
          reason,
          ...(comment.trim() && { comment: comment.trim() }),
        })
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
