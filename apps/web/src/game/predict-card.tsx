import type { GameStateDto } from '@thelever-app/protocol';
import { RadioGroup } from 'radix-ui';
import { type CSSProperties, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../avatar/avatar.tsx';
import { Icon } from '../components/icon.tsx';
import { AboutYou } from './about-you.tsx';
import { DilemmaText } from './dilemma-text.tsx';
import { AnswerSteps } from './answer-steps.tsx';
import styles from './predict-card.module.css';

type Dilemma = GameStateDto['dilemmas'][number];
type Player = GameStateDto['players'][number];

/** The predictions of a dilemma, as the player is making them. */
export interface Predictions {
  readonly votePredictions: readonly { readonly playerId: string; readonly vote: string }[];
}

interface PredictCardProps {
  readonly dilemma: Dilemma;
  /** None for the person in the gap, who predicts without voting, on this screen alone. */
  readonly vote: string | null;
  readonly predictions: Predictions;
  /** The ones whose vote the player predicts, as the room says. */
  readonly playersToPredict: readonly string[];
  /** Everyone in the game, to name those to predict. */
  readonly players: readonly Player[];
  readonly personInTheGap: string | undefined;
  readonly isSending: boolean;
  readonly onChange: (predictions: Predictions) => void;
  /** Back to the vote; none for the person in the gap, who has none. */
  readonly onBack: (() => void) | undefined;
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

/**
 * «¿Qué votó cada uno?»: the vote of each of the other players; for the person in the gap, «¿Qué
 * elegirá cada uno?», with the dilemma about them, since they have no vote to come from.
 */
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
  const votedColor = voted && optionColor(dilemma.options.length, dilemma.options.indexOf(voted));
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
      <main className={styles.main} tabIndex={0}>
        <AnswerSteps current="prediction" withVote={vote !== null} />
        {voted ? (
          <p className={styles.voted} style={{ '--option': votedColor } as CSSProperties}>
            <Icon name="checkCircle" size={18} />
            <span>
              {t('predict.voted')}
              <DilemmaText text={voted.text} personInTheGap={personInTheGap} />
              {t('predict.votedEnd')}
            </span>
          </p>
        ) : (
          <AboutYou
            dilemma={dilemma}
            personInTheGap={personInTheGap}
            text={t('aboutYou.nominal')}
          />
        )}
        <section className={styles.section} aria-labelledby={headingId}>
          <h1 id={headingId} className={styles.heading}>
            {voted ? t('predict.voteQuestion') : t('predict.aboutYouQuestion')}
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
        {onBack && (
          <button
            type="button"
            className={styles.back}
            aria-label={t('predict.back')}
            onClick={onBack}
          >
            <Icon name="arrowBack" size={22} />
          </button>
        )}
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

/** The colour of an option by its position, as on the dilemma: a and b for two, 1 to 4 for more. */
function optionColor(count: number, index: number): string {
  return count === 2 ? `var(--color-option-${'ab'[index]})` : `var(--color-option-${index + 1})`;
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
        data-count={dilemma.options.length}
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
