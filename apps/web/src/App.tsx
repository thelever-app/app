import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoom } from './room/use-room.ts';
import { DilemmaScreen } from './screens/dilemma-screen.tsx';
import { WaitingScreen } from './screens/waiting-screen.tsx';

export function App() {
  const { t } = useTranslation();
  const { game, answerDilemma } = useRoom();
  const [isReviewing, setIsReviewing] = useState(false);

  if (!game) return <p>{t('app.connecting')}</p>;

  const hasAnsweredAll = game.answers.length === game.dilemmas.length;
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
