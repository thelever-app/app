import type { ErrorCodeDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import mascotNeutral from '../assets/brand/mascot-neutral.svg';
import mascotWaiting from '../assets/brand/mascot-waiting.svg';
import { Icon } from '../components/icon.tsx';
import screen from './screen.module.css';
import styles from './no-return-screen.module.css';

interface NoReturnScreenProps {
  /** Why the room will not take the player back, as the server said it. */
  readonly code: ErrorCodeDto | undefined;
  readonly onReload: () => void;
  /** Back to the start, to create a room or join another. */
  readonly onHome: () => void;
}

type Variant = 'gone' | 'device' | 'update' | 'identity' | 'expelled';

/** Any other reason gets the variant that lets the player try again, which may help. */
function variantOf(code: ErrorCodeDto | undefined): Variant {
  switch (code) {
    case 'game-not-found':
    case 'room-not-found':
      return 'gone';
    case 'player-not-in-game':
    case 'player-not-in-room':
      return 'device';
    case 'player-expelled':
      return 'expelled';
    case 'unsupported-contract-version':
      return 'update';
    default:
      return 'identity';
  }
}

/** The room will not take the player back: what happened, and reloading when it may help. */
export function NoReturnScreen({ code, onReload, onHome }: NoReturnScreenProps) {
  const { t } = useTranslation();
  const variant = variantOf(code);
  const withReload = variant === 'update' || variant === 'identity' ? variant : undefined;

  return (
    <div className={screen.screen}>
      <main className={styles.main}>
        <div className={styles.message}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{t(`noReturn.${variant}.title`)}</h1>
            <img
              className={styles.mascot}
              src={variant === 'update' ? mascotNeutral : mascotWaiting}
              alt=""
              width={72}
              height={72}
            />
          </div>
          <p className={styles.text}>{t(`noReturn.${variant}.text`)}</p>
        </div>
      </main>
      {withReload && (
        <footer className={styles.footer}>
          <button type="button" className={styles.action} onClick={onReload}>
            <Icon name="refresh" size={20} />
            {t(`noReturn.${withReload}.action`)}
          </button>
        </footer>
      )}
      {variant === 'expelled' && (
        <footer className={styles.footer}>
          <button type="button" className={styles.action} onClick={onHome}>
            {t('noReturn.expelled.action')}
          </button>
        </footer>
      )}
    </div>
  );
}
