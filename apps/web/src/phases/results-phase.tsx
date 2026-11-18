import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { GroupProgressSheet } from '../components/group-progress-sheet.tsx';
import { isAnonymous } from '../components/players.ts';
import { HOME_PATH } from '../home-path.ts';
import { EndScreen } from '../results/end-screen.tsx';
import { KnowsScreen } from '../results/knows-screen.tsx';
import { RankingScreen } from '../results/ranking-screen.tsx';
import { ResultsHeader } from '../results/results-header.tsx';
import { TitleScreen } from '../results/title-screen.tsx';
import { resultsScreens } from '../results/titles.ts';
import styles from '../results/results.module.css';
import { useGame } from '../room/room-provider.tsx';

/**
 * After the last round, the game results screen by screen, and then the end of the game. In a
 * nominal room, each title won, who knows the player best and the ranking; in an anonymous one,
 * the ranking of who reads the group best. Any player takes everyone on to the next screen.
 */
export function ResultsPhase({ onShowQr }: { readonly onShowQr: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { game, send } = useGame();
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const leave = () => {
    send({ type: 'leave-room' });
    void navigate(HOME_PATH);
  };
  if (game.stage.kind === 'ended') {
    return (
      <EndScreen game={game} onLeave={leave} onRematch={() => send({ type: 'start-rematch' })} />
    );
  }

  const anonymous = isAnonymous(game);
  const total = resultsScreens(game, anonymous);
  const step = game.stage.step ?? 0;
  // The screens of the results come after the last round, at the positions that follow it.
  const moveOn = () => send({ type: 'move-on', fromPosition: game.dilemmas.length + step });
  const label = t('results.label', { step: step + 1, total });
  if (anonymous) {
    return <RankingScreen game={game} onMoveOn={moveOn} onLeave={leave} onShowQr={onShowQr} />;
  }
  if (step >= total - 1) {
    return (
      <RankingScreen
        game={game}
        label={label}
        onMoveOn={moveOn}
        onLeave={leave}
        onShowQr={onShowQr}
      />
    );
  }

  const titles = game.results?.titles ?? [];
  const title = titles[step];
  return (
    <ResultsStep
      header={
        <ResultsHeader
          game={game}
          label={label}
          onShowQr={onShowQr}
          onShowGroup={() => setIsGroupOpen(true)}
          onLeave={leave}
        />
      }
      next={t('results.next')}
      onMoveOn={moveOn}
    >
      {title ? <TitleScreen key={step} game={game} title={title} /> : <KnowsScreen game={game} />}
      <GroupProgressSheet game={game} open={isGroupOpen} onOpenChange={setIsGroupOpen} />
    </ResultsStep>
  );
}

function ResultsStep({
  header,
  next,
  onMoveOn,
  children,
}: {
  readonly header: ReactNode;
  readonly next: string;
  readonly onMoveOn: () => void;
  readonly children: ReactNode;
}) {
  return (
    <div className={styles.screen}>
      {header}
      <main className={styles.main} tabIndex={0}>
        {children}
      </main>
      <footer className={styles.footer}>
        <button type="button" className={styles.next} onClick={onMoveOn}>
          {next}
        </button>
      </footer>
    </div>
  );
}
