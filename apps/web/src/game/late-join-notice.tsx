import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import wavingAtJunction from '../assets/brand/waving-at-junction.svg';
import { isAnonymous } from '../components/players.ts';
import screen from '../screens/screen.module.css';
import styles from './late-join-notice.module.css';

/** What the screen to join leaves in the history when joining took the player into a game in progress. */
export interface JoinedLateState {
  readonly joinedLate: true;
}

/**
 * Whether the player has just joined the game in progress from the screen to join, and the way to
 * forget it, so the notice does not come back.
 */
export function useJoinedLate(): { readonly joinedLate: boolean; readonly forget: () => void } {
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  return {
    joinedLate: (state as Partial<JoinedLateState> | null)?.joinedLate === true,
    forget: () => void navigate(pathname, { replace: true, state: null }),
  };
}

interface LateJoinNoticeProps {
  readonly game: GameStateDto;
  readonly onEnter: () => void;
}

/**
 * Who joins once the game started learns where they come in: the round in progress, its reveal if it
 * is already showing and, in a nominal room, that they only vote.
 */
export function LateJoinNotice({ game, onEnter }: LateJoinNoticeProps) {
  const { t } = useTranslation();
  const host = game.players.find(({ playerId }) => playerId === game.hostId);
  return (
    <div className={screen.screen}>
      <div className={styles.body}>
        <div className={styles.message}>
          <div className={styles.illustration}>
            <img src={wavingAtJunction} alt={t('lateJoin.illustration')} width={360} height={170} />
          </div>
          {host && <p className={styles.room}>{t('lateJoin.room', { host: host.nickname })}</p>}
          <h1 className={styles.title}>{t('lateJoin.title')}</h1>
          <p className={styles.text}>
            {t('lateJoin.round', {
              position: game.round.position + 1,
              total: game.dilemmas.length,
            })}
            {!isAnonymous(game) && ` ${t('lateJoin.onlyVote')}`}
          </p>
        </div>
        <button type="button" className={styles.action} onClick={onEnter}>
          {t('lateJoin.enter')}
        </button>
      </div>
    </div>
  );
}
