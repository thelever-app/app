import type { AvatarDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import wavingAtJunction from '../assets/brand/waving-at-junction.svg';
import { Avatar } from '../avatar/avatar.tsx';
import screen from '../screens/screen.module.css';
import styles from './first-access.module.css';

/** Who invites the person, when they come from the link of a room. */
export interface Inviter {
  readonly nickname: string;
  readonly avatar: AvatarDto;
}

interface WelcomeScreenProps {
  readonly inviter: Inviter | undefined;
  readonly onStart: () => void;
}

/**
 * The first screen on a new device: who invites, if anyone, La Palanca by a junction of the
 * tracks, the brand and what the game is, and the way in.
 */
export function WelcomeScreen({ inviter, onStart }: WelcomeScreenProps) {
  const { t } = useTranslation();
  return (
    <div className={screen.screen}>
      <div aria-hidden="true" className={styles.welcomeStripe} />
      <main className={styles.welcome}>
        <div className={styles.welcomeHero}>
          {inviter !== undefined && (
            <span className={styles.invite}>
              <Avatar avatar={inviter.avatar} />
              {t('firstAccess.welcome.invite', { host: inviter.nickname })}
            </span>
          )}
          <img
            className={styles.welcomeArt}
            src={wavingAtJunction}
            alt={t('firstAccess.welcome.art')}
            width={360}
            height={170}
          />
          <span className={styles.welcomeBrand}>TheLever.app</span>
          <h1 className={styles.welcomeTitle}>{t('firstAccess.welcome.title')}</h1>
          <p className={styles.welcomeSubtitle}>{t('firstAccess.welcome.subtitle')}</p>
          <p className={styles.muted}>{t('firstAccess.welcome.text')}</p>
        </div>
        <button type="button" className={styles.primary} onClick={onStart}>
          {inviter === undefined ? t('firstAccess.welcome.start') : t('firstAccess.welcome.join')}
        </button>
      </main>
    </div>
  );
}
