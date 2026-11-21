import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { useDonationUrl } from '../config/donation-url.tsx';
import { useUnderEighteen } from '../first-access/device-age.tsx';
import { invitesToDonate } from './invitation-draw.ts';
import styles from './donations.module.css';

interface SupportLineProps {
  /** Where the draw comes from; chance, but for the tests. */
  readonly random?: () => number;
}

/**
 * The line of the end of the game that invites an adult to support TheLever, in one game in three,
 * drawn once when the end shows. Nothing for under 18s.
 */
export function SupportLine({ random }: SupportLineProps) {
  const { t } = useTranslation();
  const donationUrl = useDonationUrl();
  const underEighteen = useUnderEighteen();
  const [invited] = useState(() => invitesToDonate(random));
  if (underEighteen || !invited) return null;
  const line = t('donations.line');
  return (
    <a
      className={styles.line}
      href={donationUrl}
      target="_blank"
      rel="noopener"
      aria-label={t('appSettings.outside', { name: line })}
    >
      <Icon name="favorite" size={18} />
      {line}
    </a>
  );
}
