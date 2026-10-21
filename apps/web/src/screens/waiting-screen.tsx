import type { GameStateDto } from '@thelever-app/protocol';
import { useTranslation } from 'react-i18next';
import mascotDeciding from '../assets/brand/mascot-deciding.svg';
import { Icon } from '../components/icon.tsx';
import { PlayerList } from '../components/player-list.tsx';
import { StationLine } from '../components/station-line.tsx';
import screen from './screen.module.css';
import styles from './waiting-screen.module.css';

interface WaitingScreenProps {
  readonly game: GameStateDto;
  readonly onReview: () => void;
}

/** «Esperando a los demás»: the player has answered every dilemma. */
export function WaitingScreen({ game, onReview }: WaitingScreenProps) {
  const { t } = useTranslation();
  const total = game.dilemmas.length;

  return (
    <div className={screen.screen}>
      <header className={styles.header}>
        <p className={styles.position}>{t('waiting.finished', { progress: total, total })}</p>
        <StationLine stations={total} passed={total} />
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{t('waiting.title')}</h1>
            <img className={styles.mascot} src={mascotDeciding} alt="" width={72} height={72} />
          </div>
          <p className={styles.subtitle}>{t('waiting.subtitle')}</p>
          <button type="button" className={styles.review} onClick={onReview}>
            <Icon name="undo" size={18} />
            {t('waiting.review')}
          </button>
        </div>
        <PlayerList players={game.players} dilemmaCount={total} />
      </main>
    </div>
  );
}
