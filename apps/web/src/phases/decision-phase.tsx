import { useState } from 'react';
import { hasFinished } from '../components/players.ts';
import { useRoom } from '../room/room-provider.tsx';
import { DilemmaScreen } from '../screens/dilemma-screen.tsx';
import { WaitingScreen } from '../screens/waiting-screen.tsx';

/** The decision phase: the next dilemma, or waiting for the others once every one is answered. */
export function DecisionPhase() {
  const { game, rejection, answerDilemma } = useRoom();
  const [isReviewing, setIsReviewing] = useState(false);

  // The screen moves on before the room confirms; each answer it rejects starts the dilemmas
  // again, at the first one the room has without an answer.
  const [seenRejection, setSeenRejection] = useState(rejection);
  const [rejectedAnswers, setRejectedAnswers] = useState(0);
  if (rejection !== seenRejection) {
    setSeenRejection(rejection);
    if (rejection?.command === 'answer-dilemma') setRejectedAnswers(rejectedAnswers + 1);
  }

  const self = game.players.find(({ playerId }) => playerId === game.playerId);
  const hasAnsweredAll = self !== undefined && hasFinished(self, game.dilemmas.length);
  if (hasAnsweredAll && !isReviewing) {
    return <WaitingScreen game={game} onReview={() => setIsReviewing(true)} />;
  }
  return (
    <DilemmaScreen
      key={`${isReviewing ? 'review' : 'play'}:${rejectedAnswers}`}
      game={game}
      initialPosition={isReviewing ? 0 : undefined}
      onAnswer={answerDilemma}
      onDone={() => setIsReviewing(false)}
    />
  );
}
