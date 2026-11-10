import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  hasAnswered,
  isAnonymous,
  pendingCountOf,
  selfAnswered,
  selfSkipped,
} from '../components/players.ts';
import { RevealEarlyDialog } from '../game/reveal-early-dialog.tsx';
import { useGame } from '../room/room-provider.tsx';
import { DilemmaScreen } from '../screens/dilemma-screen.tsx';
import { WaitingScreen } from '../screens/waiting-screen.tsx';

/**
 * The decision of a round: its dilemma, or waiting for the others once the player answered it or
 * skipped it; the host may reveal it early from either.
 */
export function DecisionPhase() {
  const navigate = useNavigate();
  const { game, rejection, answerDilemma, send } = useGame();
  const [isChanging, setIsChanging] = useState(false);
  const [isRevealOpen, setIsRevealOpen] = useState(false);

  // The screen waits for the room to confirm an answer; each answer it rejects starts the dilemma
  // of the round again, from what the room has.
  const [seenRejection, setSeenRejection] = useState(rejection);
  const [rejectedAnswers, setRejectedAnswers] = useState(0);
  if (rejection !== seenRejection) {
    setSeenRejection(rejection);
    if (rejection?.command === 'answer-dilemma') setRejectedAnswers(rejectedAnswers + 1);
  }

  const { position } = game.round;
  const anonymous = isAnonymous(game);
  const answered = selfAnswered(game);
  const skipped = selfSkipped(game);
  const isHost = game.hostId === game.playerId;
  const pending = anonymous
    ? undefined
    : game.players.filter((player) => !player.left && !hasAnswered(player));
  const openReveal = () => setIsRevealOpen(true);

  return (
    <>
      {skipped || (answered && !isChanging) ? (
        <WaitingScreen
          game={game}
          onChange={skipped ? undefined : () => setIsChanging(true)}
          onRevealEarly={openReveal}
        />
      ) : (
        <DilemmaScreen
          key={`${position}:${rejectedAnswers}`}
          game={game}
          onAnswer={answerDilemma}
          onDone={() => setIsChanging(false)}
          onRevealEarly={isHost ? openReveal : undefined}
          onReport={(reported, reason, comment) =>
            send({
              type: 'report-dilemma',
              dilemmaId: reported,
              reason,
              ...(comment.trim() && { comment: comment.trim() }),
            })
          }
          onSkip={(skippedId) => send({ type: 'skip-dilemma', dilemmaId: skippedId })}
          onLeave={() => {
            send({ type: 'leave-room' });
            void navigate('/');
          }}
        />
      )}
      <RevealEarlyDialog
        open={isRevealOpen}
        onOpenChange={setIsRevealOpen}
        pendingCount={pendingCountOf(game)}
        pending={pending}
        onReveal={() => {
          send({ type: 'reveal-early' });
          setIsRevealOpen(false);
        }}
      />
    </>
  );
}
