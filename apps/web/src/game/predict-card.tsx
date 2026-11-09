import type { GameStateDto } from '@thelever-app/protocol';
import { RadioGroup } from 'radix-ui';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { Icon } from '../components/icon.tsx';
import { DilemmaText } from './dilemma-text.tsx';
import styles from './predict-card.module.css';

type Dilemma = GameStateDto['dilemmas'][number];
type Player = GameStateDto['players'][number];

/** The predictions of a dilemma, as the player is making them. */
export interface Predictions {
  readonly votePredictions: readonly { readonly playerId: string; readonly vote: string }[];
}

interface PredictCardProps {
  readonly dilemma: Dilemma;
  readonly vote: string;
  readonly predictions: Predictions;
  /** The ones whose vote the player predicts, as the room says. */
  readonly playersToPredict: readonly string[];
  /** Everyone in the game, to name those to predict. */
  readonly players: readonly Player[];
  readonly personInTheGap: string | undefined;
  readonly isSending: boolean;
  readonly onChange: (predictions: Predictions) => void;
  readonly onBack: () => void;
  readonly onNext: () => void;
}

/** How many predictions are still to make: one per player to predict. */
export function missingPredictions(
  playersToPredict: readonly string[],
  predictions: Predictions,
): number {
  const predicted = new Set(predictions.votePredictions.map(({ playerId }) => playerId));
  return playersToPredict.filter((playerId) => !predicted.has(playerId)).length;
}

/** «¿Qué votó cada uno?»: the vote of each of the other players. */
export function PredictCard({
  dilemma,
  vote,
  predictions,
  playersToPredict,
  players,
  personInTheGap,
  isSending,
  onChange,
  onBack,
  onNext,
}: PredictCardProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const voted = dilemma.options.find(({ optionId }) => optionId === vote);
  const missing = missingPredictions(playersToPredict, predictions);
  const toPredict = playersToPredict.flatMap((playerId) => {
    const player = players.find((candidate) => candidate.playerId === playerId);
    return player ? [player] : [];
  });

  const predictVote = (playerId: string, predicted: string) =>
    onChange({
      ...predictions,
      votePredictions: [
        ...predictions.votePredictions.filter((prediction) => prediction.playerId !== playerId),
        { playerId, vote: predicted },
      ],
    });

  return (
    <>
      <main className={styles.main}>
        <p className={styles.voted}>
          <Icon name="checkCircle" size={18} />
          <span>
            {t('predict.voted')}
            <DilemmaText text={voted?.text ?? ''} personInTheGap={personInTheGap} />
            {t('predict.votedEnd')}
          </span>
        </p>
        <section className={styles.section} aria-labelledby={headingId}>
          <h1 id={headingId} className={styles.heading}>
            {t('predict.voteQuestion')}
          </h1>
          <ul className={styles.players}>
            {toPredict.map((player) => (
              <VotePredictionCard
                key={player.playerId}
                player={player}
                dilemma={dilemma}
                personInTheGap={personInTheGap}
                predicted={
                  predictions.votePredictions.find(({ playerId }) => playerId === player.playerId)
                    ?.vote
                }
                onPredict={(predicted) => predictVote(player.playerId, predicted)}
              />
            ))}
          </ul>
        </section>
      </main>
      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.back}
          aria-label={t('predict.back')}
          onClick={onBack}
        >
          <Icon name="arrowBack" size={22} />
        </button>
        <button
          type="button"
          className={styles.next}
          disabled={missing > 0 || isSending}
          onClick={onNext}
        >
          {missing > 0 ? t('predict.missing', { count: missing }) : t('predict.next')}
        </button>
      </footer>
    </>
  );
}

interface VotePredictionCardProps {
  readonly player: Player;
  readonly dilemma: Dilemma;
  readonly personInTheGap: string | undefined;
  readonly predicted: string | undefined;
  readonly onPredict: (vote: string) => void;
}

function VotePredictionCard({
  player,
  dilemma,
  personInTheGap,
  predicted,
  onPredict,
}: VotePredictionCardProps) {
  const { t } = useTranslation();
  return (
    <li className={styles.player}>
      <p className={styles.playerName}>
        <Avatar avatar={player.avatar} size="xs" dimmed={!player.connected} />
        {player.nickname}
      </p>
      <RadioGroup.Root
        className={styles.options}
        aria-label={t('predict.voteOf', { name: player.nickname })}
        value={predicted ?? ''}
        onValueChange={onPredict}
      >
        {dilemma.options.map((option) => (
          <RadioGroup.Item key={option.optionId} value={option.optionId} className={styles.option}>
            <DilemmaText text={option.text} personInTheGap={personInTheGap} />
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </li>
  );
}
