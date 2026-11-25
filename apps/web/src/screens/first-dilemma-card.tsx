import type { DilemmaPreviewResponseDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { DilemmaText } from '../game/dilemma-text.tsx';
import styles from './first-dilemma-card.module.css';

interface FirstDilemmaCardProps {
  readonly dilemma: DilemmaPreviewResponseDto;
  /** A dilemma for adults with Classic chosen: the room starts without it. */
  readonly off: boolean;
}

/** The dilemma the room starts with, as the link opened it; off when the ambience leaves it out. */
export function FirstDilemmaCard({ dilemma, off }: FirstDilemmaCardProps) {
  const { t } = useTranslation();
  const category = t(`categories.${dilemma.category}`);
  return (
    <section
      className={styles.first}
      aria-label={t('pickDilemmas.title', { number: 1 })}
      aria-disabled={off || undefined}
      data-off={off || undefined}
      data-testid="first-dilemma"
    >
      <Icon name={off ? 'block' : 'pushPin'} size={22} />
      <span className={styles.firstText}>
        <span className={styles.kicker}>
          {off ? t('playDilemma.leftOut') : t('playDilemma.firstDilemma')}
        </span>
        <span className={styles.name}>
          {dilemma.name ?? (
            <DilemmaText text={dilemma.text} personInTheGap={t('pickDilemmas.someone')} />
          )}
        </span>
        <span className={styles.about} data-testid="first-dilemma-about">
          {off
            ? t('playDilemma.offInClassic')
            : dilemma.minimumAge === 18
              ? t('playDilemma.aboutForAdults', { category })
              : t('playDilemma.about', { category })}
        </span>
      </span>
    </section>
  );
}
