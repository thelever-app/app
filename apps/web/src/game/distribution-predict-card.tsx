import {
  DistributionPredictionVO,
  type PredictedShare,
} from '@thelever-app/game/distribution-prediction';
import { GAP_MARKER, type GameStateDto } from '@thelever-app/protocol';
import { type CSSProperties, type KeyboardEvent, type SyntheticEvent, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { DilemmaText } from './dilemma-text.tsx';
import styles from './distribution-predict-card.module.css';

type Dilemma = GameStateDto['dilemmas'][number];

interface DistributionPredictCardProps {
  readonly dilemma: Dilemma;
  readonly vote: string;
  readonly prediction: readonly PredictedShare[];
  readonly personInTheGap: string | undefined;
  readonly isSending: boolean;
  /** Each step of a bar while the player moves it. */
  readonly onChange: (prediction: readonly PredictedShare[]) => void;
  /** The player let go of a bar: the prediction so far goes to the room. */
  readonly onRelease: (prediction: readonly PredictedShare[]) => void;
  readonly onBack: () => void;
  readonly onReady: () => void;
}

/** The keys that move a bar; any other, a Tab that lands on it, changes nothing to send. */
const MOVING_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

/** The colour of an option by its position, as on the dilemma: a and b for two, 1 to 4 for more. */
function optionColor(count: number, index: number): string {
  return count === 2 ? `var(--color-option-${'ab'[index]})` : `var(--color-option-${index + 1})`;
}

/**
 * «¿Cómo se repartirá el grupo?»: the share of the group, the player included, that will choose
 * each option, in steps of 5 % that always add up to 100. Moving a bar adjusts the others in
 * proportion; with two options, one slider sets both.
 */
export function DistributionPredictCard({
  dilemma,
  vote,
  prediction,
  personInTheGap,
  isSending,
  onChange,
  onRelease,
  onBack,
  onReady,
}: DistributionPredictCardProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const count = dilemma.options.length;
  const votedIndex = dilemma.options.findIndex(({ optionId }) => optionId === vote);
  const voted = dilemma.options[votedIndex];
  const current = new DistributionPredictionVO(prediction);
  const shareOf = (optionId: string) => current.shareOf(optionId);
  const moved = (optionId: string, event: SyntheticEvent<HTMLInputElement>) =>
    current.withShare(optionId, Number(event.currentTarget.value)).shares;
  // A bar goes to the room when the player lets go of it, by pointer or by keyboard.
  const sliderOf = (optionId: string, label: string) => ({
    type: 'range',
    min: 0,
    max: 100,
    step: 5,
    value: shareOf(optionId),
    'aria-label': t('distribution.shareOf', { option: label }),
    'aria-valuetext': t('distribution.percent', { value: shareOf(optionId) }),
    onChange: (event: SyntheticEvent<HTMLInputElement>) => onChange(moved(optionId, event)),
    onPointerUp: (event: SyntheticEvent<HTMLInputElement>) => onRelease(moved(optionId, event)),
    // A drag the browser takes over for a scroll ends without the pointer going up.
    onPointerCancel: (event: SyntheticEvent<HTMLInputElement>) => onRelease(moved(optionId, event)),
    onBlur: (event: SyntheticEvent<HTMLInputElement>) => onRelease(moved(optionId, event)),
    onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => {
      if (MOVING_KEYS.has(event.key)) onRelease(moved(optionId, event));
    },
  });
  const plain = (text: string) => text.replaceAll(GAP_MARKER, personInTheGap ?? '');

  return (
    <>
      <main className={styles.main} tabIndex={0}>
        {voted && (
          <p
            className={styles.voted}
            style={{ '--option': optionColor(count, votedIndex) } as CSSProperties}
          >
            <Icon name="checkCircle" size={18} />
            <span>
              {t('predict.voted')}
              <DilemmaText text={voted.text} personInTheGap={personInTheGap} />
              {t('predict.votedEnd')}
            </span>
          </p>
        )}
        <section className={styles.section} aria-labelledby={headingId}>
          <div className={styles.ask}>
            <h1 id={headingId} className={styles.heading}>
              {t('distribution.question')}
            </h1>
            <p className={styles.hint}>
              {count === 2 ? t('distribution.hintTwo') : t('distribution.hint')}
            </p>
          </div>
          {count === 2 ? (
            <div className={styles.pair}>
              <div className={styles.pairHead}>
                {dilemma.options.map((option, index) => (
                  <p
                    key={option.optionId}
                    className={styles.pairOption}
                    style={{ '--option': optionColor(count, index) } as CSSProperties}
                  >
                    <span className={styles.optionText}>
                      <DilemmaText text={option.text} personInTheGap={personInTheGap} />
                    </span>
                    {option.optionId === vote && (
                      <span className={styles.yourVote}>{t('distribution.yourVote')}</span>
                    )}
                    <span className={styles.pairShare}>
                      {t('distribution.percent', { value: shareOf(option.optionId) })}
                    </span>
                  </p>
                ))}
              </div>
              <input
                className={styles.slider}
                style={{ '--option': optionColor(count, 0) } as CSSProperties}
                {...sliderOf(dilemma.options[0]!.optionId, plain(dilemma.options[0]!.text))}
              />
              <div aria-hidden="true" className={styles.split}>
                {dilemma.options.map((option, index) => (
                  <span
                    key={option.optionId}
                    style={
                      {
                        '--option': optionColor(count, index),
                        width: `${shareOf(option.optionId)}%`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            <ul className={styles.options}>
              {dilemma.options.map((option, index) => (
                <li
                  key={option.optionId}
                  className={styles.option}
                  style={{ '--option': optionColor(count, index) } as CSSProperties}
                >
                  <p className={styles.optionHead}>
                    <span aria-hidden="true" className={styles.dot} />
                    <span className={styles.optionText}>
                      <DilemmaText text={option.text} personInTheGap={personInTheGap} />
                    </span>
                    {option.optionId === vote && (
                      <span className={styles.yourVote}>{t('distribution.yourVote')}</span>
                    )}
                    <span className={styles.share}>
                      {t('distribution.percent', { value: shareOf(option.optionId) })}
                    </span>
                  </p>
                  <input
                    className={styles.slider}
                    {...sliderOf(option.optionId, plain(option.text))}
                  />
                </li>
              ))}
            </ul>
          )}
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
        <button type="button" className={styles.next} disabled={isSending} onClick={onReady}>
          {t('predict.next')}
        </button>
      </footer>
    </>
  );
}
