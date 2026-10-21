import type { GameStateDto } from '@thelever-app/protocol';
import { useState } from 'react';
import { ProgressStrip } from '../components/progress-strip.tsx';
import { DilemmaCard } from './dilemma-card.tsx';
import styles from './screen.module.css';

interface DilemmaScreenProps {
  readonly game: GameStateDto;
  /** Where to start; by default, the first dilemma the player has not answered. */
  readonly initialPosition?: number;
  readonly onAnswer: (dilemmaId: string, vote: string) => void;
  /** The player moved on from the last dilemma. */
  readonly onDone: () => void;
}

export function DilemmaScreen({ game, initialPosition, onAnswer, onDone }: DilemmaScreenProps) {
  const votes = new Map(game.answers.map(({ dilemmaId, vote }) => [dilemmaId, vote]));
  const firstUnanswered = game.dilemmas.findIndex(({ dilemmaId }) => !votes.has(dilemmaId));
  const lastPosition = game.dilemmas.length - 1;

  const [position, setPosition] = useState(
    () => initialPosition ?? (firstUnanswered === -1 ? lastPosition : firstUnanswered),
  );

  const dilemma = game.dilemmas[position]!;
  const savedVote = votes.get(dilemma.dilemmaId);

  return (
    <div className={styles.screen}>
      <ProgressStrip
        position={position}
        players={game.players}
        dilemmaCount={game.dilemmas.length}
        selfPlayerId={game.playerId}
      />
      <DilemmaCard
        key={dilemma.dilemmaId}
        dilemma={dilemma}
        savedVote={savedVote}
        canGoBack={position > 0}
        onBack={() => setPosition(position - 1)}
        onContinue={(vote) => {
          if (vote !== savedVote) onAnswer(dilemma.dilemmaId, vote);
          if (position < lastPosition) setPosition(position + 1);
          else onDone();
        }}
      />
    </div>
  );
}
