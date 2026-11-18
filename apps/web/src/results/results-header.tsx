import type { GameStateDto } from '@thelever-app/protocol';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { usePlayerName } from '../components/players.ts';
import { GameMenu } from '../game/game-menu.tsx';
import { Players } from '../reveal/reveal-screen.tsx';
import styles from './results.module.css';

/** How long the notice of who moved everyone on stays in the strip. */
const MOVED_ON_NOTICE_MS = 4000;

interface ResultsHeaderProps {
  readonly game: GameStateDto;
  readonly label: string;
  readonly onShowQr: () => void;
  readonly onShowGroup: () => void;
  readonly onLeave: () => void;
}

/**
 * The top of each screen of the results: where they are, the menu and who is in the game; for a few
 * seconds after someone moved everyone on, who it was, without covering anything below.
 */
export function ResultsHeader({ game, label, onShowQr, onShowGroup, onLeave }: ResultsHeaderProps) {
  const { t } = useTranslation();
  const nameOf = usePlayerName();
  const { step, movedOnBy } = game.stage;
  const [seenStep, setSeenStep] = useState(step);
  const [mover, setMover] = useState(movedOnBy);
  if (step !== seenStep) {
    setSeenStep(step);
    setMover(movedOnBy);
  }
  useEffect(() => {
    if (mover === null) return;
    const hide = setTimeout(() => setMover(null), MOVED_ON_NOTICE_MS);
    return () => clearTimeout(hide);
  }, [mover, seenStep]);
  const moverPlayer = game.players.find(
    ({ playerId }) => playerId === mover && playerId !== game.playerId,
  );

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <p className={styles.label}>{label}</p>
        <GameMenu
          code={game.code}
          onShowQr={onShowQr}
          onShowGroup={onShowGroup}
          onLeave={onLeave}
        />
      </div>
      <div className={styles.strip}>
        <Players players={game.players} selfId={game.playerId} />
        {moverPlayer && (
          <span role="status" className={styles.movedOn}>
            <Icon name="arrowForward" size={16} />
            {t('progressStrip.movedOn', { name: nameOf(moverPlayer) })}
          </span>
        )}
      </div>
    </header>
  );
}
