import type { GameStateDto } from '@thelever-app/protocol';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import styles from './dilemma-card.module.css';

interface DilemmaCardProps {
  readonly dilemma: GameStateDto['dilemmas'][number];
  /** The vote the player already gave to this dilemma, if any. */
  readonly savedVote: string | undefined;
  readonly canGoBack: boolean;
  readonly onBack: () => void;
  readonly onContinue: (vote: string) => void;
}

/** One dilemma: its text, its options and the way on. Its choice starts from the saved vote. */
export function DilemmaCard({
  dilemma,
  savedVote,
  canGoBack,
  onBack,
  onContinue,
}: DilemmaCardProps) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState(savedVote);

  return (
    <>
      <main className={styles.main}>
        <h1 className={styles.text}>{dilemma.text}</h1>
        <div
          className={styles.options}
          data-layout={dilemma.options.length === 2 ? 'pair' : 'list'}
        >
          {dilemma.options.map((option) => (
            <button
              key={option.optionId}
              type="button"
              className={styles.option}
              aria-pressed={chosen === option.optionId}
              onClick={() => setChosen(option.optionId)}
            >
              {option.text}
              {chosen === option.optionId && (
                <span className={styles.check}>
                  <Icon name="checkCircle" size={20} />
                </span>
              )}
            </button>
          ))}
        </div>
        <p className={styles.privacy}>{t('dilemma.privacy')}</p>
      </main>
      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.back}
          aria-label={t('dilemma.back')}
          disabled={!canGoBack}
          onClick={onBack}
        >
          <Icon name="arrowBack" size={22} />
        </button>
        <button
          type="button"
          className={styles.continue}
          disabled={chosen === undefined}
          onClick={() => {
            if (chosen !== undefined) onContinue(chosen);
          }}
        >
          {chosen === undefined ? t('dilemma.choose') : t('dilemma.continue')}
        </button>
      </footer>
    </>
  );
}
