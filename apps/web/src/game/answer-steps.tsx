import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import styles from './answer-steps.module.css';

type AnswerStep = 'vote' | 'prediction';

interface AnswerStepsProps {
  /** The step the player is on. */
  readonly current: AnswerStep;
  /** Without a vote, for the person in the gap, who only predicts. */
  readonly withVote: boolean;
}

/** Where the player is in their answer: «Tu voto», then «Tu predicción». */
export function AnswerSteps({ current, withVote }: AnswerStepsProps) {
  const { t } = useTranslation();
  const steps: readonly AnswerStep[] = withVote ? ['vote', 'prediction'] : ['prediction'];
  const currentIndex = steps.indexOf(current);

  return (
    <ol className={styles.steps} aria-label={t('answerSteps.label')}>
      {steps.map((step, index) => (
        <li
          key={step}
          className={styles.step}
          aria-current={index === currentIndex ? 'step' : undefined}
          data-done={index < currentIndex ? '' : undefined}
        >
          <span aria-hidden="true" className={styles.mark}>
            {index < currentIndex ? <Icon name="check" size={16} /> : index + 1}
          </span>
          {t(`answerSteps.${step}`)}
        </li>
      ))}
    </ol>
  );
}
