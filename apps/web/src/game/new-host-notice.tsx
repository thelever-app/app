import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import mascotNeutral from '../assets/brand/mascot-neutral.svg';
import { useGame } from '../room/room-provider.tsx';
import { GameToast } from './game-toast.tsx';
import styles from './new-host-notice.module.css';

/** How long the notice of becoming the host stays on screen. */
const NEW_HOST_NOTICE_MS = 8000;

/** «Ahora eres el anfitrión», for a while, when the role passes to the player from whoever had it. */
export function NewHostNotice() {
  const { t } = useTranslation();
  const { game } = useGame();

  // Who took over the role from whom, while the notice of it lasts.
  const [seenHostId, setSeenHostId] = useState(game.hostId);
  const [newHostFrom, setNewHostFrom] = useState<string | undefined>(undefined);
  if (game.hostId !== seenHostId) {
    setSeenHostId(game.hostId);
    setNewHostFrom(game.hostId === game.playerId ? seenHostId : undefined);
  }
  useEffect(() => {
    if (newHostFrom === undefined) return;
    const hide = setTimeout(() => setNewHostFrom(undefined), NEW_HOST_NOTICE_MS);
    return () => clearTimeout(hide);
  }, [newHostFrom]);

  const previousHost = game.players.find(({ playerId }) => playerId === newHostFrom);
  if (!previousHost) return null;
  return (
    <GameToast>
      <div className={styles.newHost}>
        <span className={styles.mascot}>
          <img src={mascotNeutral} alt="" width={34} height={34} />
        </span>
        <span className={styles.newHostText}>
          <strong className={styles.signal}>{t('newHost.title')}</strong>
          <span>
            {previousHost.left
              ? t('newHost.left', { host: previousHost.nickname })
              : t('newHost.disconnected', { host: previousHost.nickname })}
          </span>
        </span>
      </div>
    </GameToast>
  );
}
