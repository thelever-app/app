import type { GameStateDto } from '@thelever-app/protocol';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { DilemmaText } from './dilemma-text.tsx';
import styles from './about-you.module.css';

interface AboutYouProps {
  readonly dilemma: GameStateDto['dilemmas'][number];
  /** The nickname of the player, who takes the gap. */
  readonly personInTheGap: string | undefined;
  /** What they are asked instead of a vote, which tells nominal from anonymous rooms. */
  readonly text: string;
}

/**
 * «Va sobre ti»: the person in the gap does not vote the dilemma about them, so they read it here,
 * on the only screen they have, before predicting what the group will do with them.
 */
export function AboutYou({ dilemma, personInTheGap, text }: AboutYouProps) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <div className={styles.about}>
      <section className={styles.card} aria-labelledby={titleId}>
        <div className={styles.head}>
          <Icon name="personPin" size={26} />
          <p id={titleId} className={styles.title}>
            {t('aboutYou.title')}
          </p>
        </div>
        <p className={styles.text}>{text}</p>
      </section>
      <p className={styles.dilemma} data-testid="dilemma-text">
        <DilemmaText text={dilemma.text} personInTheGap={personInTheGap} />
      </p>
    </div>
  );
}
