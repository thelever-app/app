import { useTranslation } from 'react-i18next';
// Inline, in the page itself: these screens show when the network may be gone.
import mascotWaiting from '../assets/brand/mascot-waiting.svg?inline';
import { Icon } from '../components/icon.tsx';
import screen from './screen.module.css';
import styles from './join-refusal.module.css';

/** Why the player cannot enter the room they tried. */
export type JoinRefusalCode =
  'room-code-not-found' | 'room-full' | 'player-expelled' | 'room-not-found';

const REFUSALS: readonly string[] = [
  'room-code-not-found',
  'room-full',
  'player-expelled',
  'room-not-found',
] satisfies readonly JoinRefusalCode[];

/** Whether the code the room server answered with is one of the refusals this screen explains. */
export function isJoinRefusal(code: string | undefined): code is JoinRefusalCode {
  return code !== undefined && REFUSALS.includes(code);
}

interface JoinRefusalProps {
  readonly code: JoinRefusalCode;
  /** Try another code, or back to the start: the only way on. */
  readonly onAction: () => void;
}

/** The player does not enter the room: what happened, and the way on. */
export function JoinRefusal({ code, onAction }: JoinRefusalProps) {
  const { t } = useTranslation();
  return (
    <div className={screen.screen}>
      <div className={styles.body}>
        <button
          type="button"
          className={styles.back}
          aria-label={t('home.back')}
          onClick={onAction}
        >
          <Icon name="arrowBack" />
        </button>
        <div className={styles.message} role="alert">
          <img className={styles.mascot} src={mascotWaiting} alt="" width={96} height={96} />
          <h1 className={styles.title}>{t(`joinRefusal.${code}.title`)}</h1>
          <p className={styles.text}>{t(`joinRefusal.${code}.text`)}</p>
        </div>
        <button type="button" className={styles.action} onClick={onAction}>
          {t(`joinRefusal.${code}.action`)}
        </button>
      </div>
    </div>
  );
}
