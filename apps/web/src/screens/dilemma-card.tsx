import type { GameStateDto } from '@thelever-app/protocol';
import { RadioGroup } from 'radix-ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { DilemmaText } from '../game/dilemma-text.tsx';
import styles from './dilemma-card.module.css';

interface DilemmaCardProps {
  readonly dilemma: GameStateDto['dilemmas'][number];
  /** The nickname that takes the gap «alguien del grupo», if the dilemma has it. */
  readonly personInTheGap?: string | undefined;
  /** The vote the room has recorded for this dilemma, if any. */
  readonly savedVote: string | undefined;
  readonly canGoBack: boolean;
  /** The answer is on its way to the room: the player cannot send it again meanwhile. */
  readonly isSending: boolean;
  readonly onBack: () => void;
  readonly onContinue: (vote: string) => void;
}

/** One dilemma: its text, its options and the way on. Its choice starts from the saved vote. */
export function DilemmaCard({
  dilemma,
  personInTheGap,
  savedVote,
  canGoBack,
  isSending,
  onBack,
  onContinue,
}: DilemmaCardProps) {
  const { t } = useTranslation();
  const textId = useId();
  const [chosen, setChosen] = useState(savedVote);

  return (
    <>
      <main className={styles.main}>
        <h1 id={textId} className={styles.text}>
          <DilemmaText text={dilemma.text} personInTheGap={personInTheGap} />
        </h1>
        <RadioGroup.Root
          className={styles.options}
          data-layout={dilemma.options.length === 2 ? 'pair' : 'list'}
          aria-labelledby={textId}
          value={chosen ?? ''}
          onValueChange={setChosen}
        >
          {dilemma.options.map((option) => (
            <RadioGroup.Item
              key={option.optionId}
              value={option.optionId}
              className={styles.option}
            >
              <DilemmaText text={option.text} personInTheGap={personInTheGap} />
              <RadioGroup.Indicator className={styles.check}>
                <Icon name="checkCircle" size={20} />
              </RadioGroup.Indicator>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
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
          disabled={chosen === undefined || isSending}
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
