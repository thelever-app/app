import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icon.tsx';
import styles from '../first-access/first-access.module.css';
import screen from '../screens/screen.module.css';

const POINTS: readonly (readonly ['hidden' | 'deleted' | 'predict', IconName])[] = [
  ['hidden', 'visibilityOff'],
  ['deleted', 'autoDelete'],
  ['predict', 'howToVote'],
];

/** Where the page keeps the game whose notice the player read, while the tab lives. */
const TOLD_KEY = 'thelever.toldAnonymous';

/** The game whose notice the player read in this tab, if any. */
export function toldAnonymousGame(): string | undefined {
  try {
    return sessionStorage.getItem(TOLD_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function rememberToldAnonymous(gameId: string): void {
  try {
    sessionStorage.setItem(TOLD_KEY, gameId);
  } catch {
    // A tab that keeps nothing tells it again after a reload, which is only a notice.
  }
}

/**
 * Before the first dilemma of an anonymous game, every player learns what anonymous means: the
 * group never sees their votes, only how many chose each option, and the votes are only used to
 * play.
 */
export function AnonymousNotice({ onStart }: { readonly onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <div className={screen.screen}>
      <main className={styles.step}>
        <span className={styles.stepOf}>{t('anonymousNotice.label')}</span>
        <h1 className={styles.title}>{t('anonymousNotice.title')}</h1>
        <ul className={styles.points}>
          {POINTS.map(([point, icon]) => (
            <li key={point} className={styles.point} data-point={point}>
              <span className={styles.pointIcon}>
                <Icon name={icon} size={20} />
              </span>
              <p className={styles.pointText}>
                <strong>{t(`anonymousNotice.${point}.title`)}</strong>{' '}
                {t(`anonymousNotice.${point}.text`)}
              </p>
            </li>
          ))}
        </ul>
        <div className={styles.grow} />
        <button type="button" className={styles.primary} onClick={onStart}>
          {t('anonymousNotice.start')}
        </button>
      </main>
    </div>
  );
}
