import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import mascotNeutral from '../assets/brand/mascot-neutral.svg';
import { hasFinished } from '../components/players.ts';
import { GameToast } from '../game/game-toast.tsx';
import { LaunchRevealDialog } from '../game/launch-reveal-dialog.tsx';
import { useGame } from '../room/room-provider.tsx';
import { DilemmaScreen } from '../screens/dilemma-screen.tsx';
import { WaitingScreen } from '../screens/waiting-screen.tsx';
import styles from './decision-phase.module.css';

/** How long the notice of becoming the host stays on screen. */
const NEW_HOST_NOTICE_MS = 8000;

/**
 * The decision phase: the next dilemma, or waiting for the others once every one is answered; the
 * host may start the reveal from either.
 */
export function DecisionPhase() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { game, rejection, answerDilemma, send } = useGame();
  const [isReviewing, setIsReviewing] = useState(false);
  const [isLaunchOpen, setIsLaunchOpen] = useState(false);

  // The screen moves on before the room confirms; each answer it rejects starts the dilemmas
  // again, at the first one the room has without an answer.
  const [seenRejection, setSeenRejection] = useState(rejection);
  const [rejectedAnswers, setRejectedAnswers] = useState(0);
  if (rejection !== seenRejection) {
    setSeenRejection(rejection);
    if (rejection?.command === 'answer-dilemma') setRejectedAnswers(rejectedAnswers + 1);
  }

  // Who took over the role from whom, while the notice of it lasts.
  const [seenHostId, setSeenHostId] = useState(game.hostId);
  const [newHostFrom, setNewHostFrom] = useState<string | undefined>(undefined);
  if (game.hostId !== seenHostId) {
    setSeenHostId(game.hostId);
    setNewHostFrom(game.hostId === game.playerId ? seenHostId : undefined);
  }
  useEffect(() => {
    if (newHostFrom === undefined) return;
    const hide = setTimeout(() => setNewHostFrom(undefined), NEW_HOST_NOTICE_MS);
    return () => clearTimeout(hide);
  }, [newHostFrom]);

  const total = game.dilemmas.length;
  const self = game.players.find(({ playerId }) => playerId === game.playerId);
  const hasAnsweredAll = self !== undefined && hasFinished(self, total);
  const stragglers = game.players.filter(({ progress, left }) => !left && progress < total);
  const previousHost = game.players.find(({ playerId }) => playerId === newHostFrom);
  const openLaunch = () => setIsLaunchOpen(true);

  return (
    <>
      {hasAnsweredAll && !isReviewing ? (
        <WaitingScreen
          game={game}
          onReview={() => setIsReviewing(true)}
          onLaunchReveal={openLaunch}
        />
      ) : (
        <DilemmaScreen
          key={`${isReviewing ? 'review' : 'play'}:${rejectedAnswers}`}
          game={game}
          initialPosition={isReviewing ? 0 : undefined}
          onAnswer={answerDilemma}
          onDone={() => setIsReviewing(false)}
          onLaunchReveal={openLaunch}
          onReport={(dilemmaId, reason, comment) =>
            send({
              type: 'report-dilemma',
              dilemmaId,
              reason,
              ...(comment.trim() && { comment: comment.trim() }),
            })
          }
          onSkip={(dilemmaId) => send({ type: 'skip-dilemma', dilemmaId })}
          onLeave={() => {
            send({ type: 'leave-room' });
            void navigate('/');
          }}
        />
      )}
      <LaunchRevealDialog
        open={isLaunchOpen}
        onOpenChange={setIsLaunchOpen}
        stragglers={stragglers}
        onLaunch={() => {
          send({ type: 'start-reveal' });
          setIsLaunchOpen(false);
        }}
      />
      {previousHost && (
        <GameToast>
          <div className={styles.newHost}>
            <span className={styles.mascot}>
              <img src={mascotNeutral} alt="" width={34} height={34} />
            </span>
            <span className={styles.newHostText}>
              <strong className={styles.signal}>{t('newHost.title')}</strong>
              <span>
                {previousHost.left
                  ? t('newHost.left', { host: previousHost.nickname })
                  : t('newHost.disconnected', { host: previousHost.nickname })}
              </span>
            </span>
          </div>
        </GameToast>
      )}
    </>
  );
}
