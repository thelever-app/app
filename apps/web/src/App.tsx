import { useState } from 'react';
import { hasFinished } from './components/players.ts';
import { useRoom } from './room/room-provider.tsx';
import { DilemmaScreen } from './screens/dilemma-screen.tsx';
import { WaitingScreen } from './screens/waiting-screen.tsx';

export function App() {
  const { game, answerDilemma } = useRoom();
  const [isReviewing, setIsReviewing] = useState(false);

  const self = game.players.find(({ playerId }) => playerId === game.playerId);
  const hasAnsweredAll = self !== undefined && hasFinished(self, game.dilemmas.length);
  if (hasAnsweredAll && !isReviewing) {
    return <WaitingScreen game={game} onReview={() => setIsReviewing(true)} />;
  }
  return (
    <DilemmaScreen
      key={isReviewing ? 'review' : 'play'}
      game={game}
      {...(isReviewing ? { initialPosition: 0 } : {})}
      onAnswer={answerDilemma}
      onDone={() => setIsReviewing(false)}
    />
  );
}
