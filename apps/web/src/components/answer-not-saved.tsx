import { useTranslation } from 'react-i18next';
import { Icon } from './icon.tsx';
import styles from './notice-bar.module.css';

interface AnswerNotSavedProps {
  readonly onDismiss: () => void;
}

/** Over the screen when the server rejected an answer: the dilemma shows again without it. */
export function AnswerNotSaved({ onDismiss }: AnswerNotSavedProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className={`${styles.bar} ${styles.signal}`}>
      <Icon name="error" />
      <span className={styles.text}>{t('notices.answerNotSaved')}</span>
      <button
        type="button"
        className={styles.dismiss}
        aria-label={t('notices.dismiss')}
        onClick={onDismiss}
      >
        <Icon name="close" size={20} />
      </button>
    </div>
  );
}
