import type { GameStateDto } from '@thelever-app/protocol';
import { RadioGroup } from 'radix-ui';
import { type CSSProperties, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { Icon } from '../components/icon.tsx';
import { DilemmaText } from './dilemma-text.tsx';
import styles from './predict-card.module.css';

type Dilemma = GameStateDto['dilemmas'][number];
type Player = GameStateDto['players'][number];

/** The predictions of a dilemma, as the player is making them. */
export interface Predictions {
  readonly matchPrediction: number | null;
  readonly votePredictions: readonly { readonly playerId: string; readonly vote: string }[];
}

interface PredictCardProps {
  readonly dilemma: Dilemma;
  readonly vote: string;
  readonly predictions: Predictions;
  /** Everyone in the game, to name those of the subset. */
  readonly players: readonly Player[];
  readonly personInTheGap: string | undefined;
  readonly isSending: boolean;
  readonly onChange: (predictions: Predictions) => void;
  readonly onBack: () => void;
  readonly onNext: () => void;
}

/** How many predictions are still to make: the match one and one per player of the subset. */
export function missingPredictions(dilemma: Dilemma, predictions: Predictions): number {
  const predicted = new Set(predictions.votePredictions.map(({ playerId }) => playerId));
  const votes = dilemma.predictionSubset.filter((playerId) => !predicted.has(playerId)).length;
  return votes + (predictions.matchPrediction === null ? 1 : 0);
}

/** «De los otros N, ¿cuántos eligieron lo mismo que tú?» and the vote of each player of the subset. */
export function PredictCard({
  dilemma,
  vote,
  predictions,
  players,
  personInTheGap,
  isSending,
  onChange,
  onBack,
  onNext,
}: PredictCardProps) {
  const { t } = useTranslation();
  const matchId = useId();
  const others = players.length - 1;
  const voted = dilemma.options.find(({ optionId }) => optionId === vote);
  const { matchPrediction } = predictions;
  const missing = missingPredictions(dilemma, predictions);
  const subset = dilemma.predictionSubset.flatMap((playerId) => {
    const player = players.find((candidate) => candidate.playerId === playerId);
    return player ? [player] : [];
  });
  const fill = {
    '--fill': `${((matchPrediction ?? 0) / Math.max(others, 1)) * 100}%`,
  } as CSSProperties;

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
        <section className={styles.section} aria-labelledby={matchId}>
          <h1 id={matchId} className={styles.heading}>
            {t('predict.matchQuestion', { count: others })}
          </h1>
          <RadioGroup.Root
            className={styles.bar}
            style={fill}
            aria-labelledby={matchId}
            value={matchPrediction === null ? '' : String(matchPrediction)}
            onValueChange={(value) => onChange({ ...predictions, matchPrediction: Number(value) })}
            data-chosen={matchPrediction !== null || undefined}
          >
            <span aria-hidden="true" className={styles.track} />
            {Array.from({ length: others + 1 }, (_, count) => (
              <RadioGroup.Item
                key={count}
                value={String(count)}
                className={styles.step}
                aria-label={t('predict.matchValue', { count, total: others })}
              />
            ))}
          </RadioGroup.Root>
          <p className={styles.readout} data-chosen={matchPrediction !== null || undefined}>
            {matchPrediction === null
              ? t('predict.matchHint')
              : t('predict.matchChosen', { count: matchPrediction, total: others })}
          </p>
        </section>
        {subset.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.heading}>{t('predict.voteQuestion')}</h2>
            <ul className={styles.players}>
              {subset.map((player) => (
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
        )}
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
