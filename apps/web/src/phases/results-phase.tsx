import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { GroupProgressSheet } from '../components/group-progress-sheet.tsx';
import { isAnonymous } from '../components/players.ts';
import { HOME_PATH } from '../home-path.ts';
import { EndScreen } from '../results/end-screen.tsx';
import { KnowsScreen } from '../results/knows-screen.tsx';
import { RankingScreen } from '../results/ranking-screen.tsx';
import { ResultsHeader } from '../results/results-header.tsx';
import { RESULTS_INTRO_MS, ResultsIntro } from '../results/results-intro.tsx';
import { TitleScreen } from '../results/title-screen.tsx';
import { resultsScreens } from '../results/titles.ts';
import styles from '../results/results.module.css';
import { useGame } from '../room/room-provider.tsx';

/**
 * After the last round, a brief passage and the game results screen by screen, and then the end of
 * the game. In a nominal room, each title won, who knows the player best and the ranking; in an
 * anonymous one, the ranking of who reads the group best. Any player takes everyone on to the next
 * screen; on their own device, each one can look back at the screens before, without moving anyone.
 */
export function ResultsPhase({ onShowQr }: { readonly onShowQr: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { game, send } = useGame();
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const step = game.stage.step ?? 0;

  // The passage shows when the results open on their first screen: coming from the last round.
  const [intro, setIntro] = useState(game.stage.kind === 'results' && step === 0);
  useEffect(() => {
    if (!intro) return;
    const hide = setTimeout(() => setIntro(false), RESULTS_INTRO_MS);
    return () => clearTimeout(hide);
  }, [intro]);

  // How many screens behind the group the player is looking; when the group moves on, none.
  const [behind, setBehind] = useState(0);
  const [seenStep, setSeenStep] = useState(step);
  if (step !== seenStep) {
    setSeenStep(step);
    setBehind(0);
  }

  const leave = () => {
    send({ type: 'leave-room' });
    void navigate(HOME_PATH);
  };
  if (game.stage.kind === 'ended') {
    return (
      <EndScreen game={game} onLeave={leave} onRematch={() => send({ type: 'start-rematch' })} />
    );
  }
  if (intro) return <ResultsIntro />;

  const anonymous = isAnonymous(game);
  const total = resultsScreens(game, anonymous);
  const shown = step - behind;
  // The screens of the results come after the last round, at the positions that follow it. Who
  // joined once the rounds were over only watches them.
  const moveOn = game.inGame
    ? () => send({ type: 'move-on', fromPosition: game.dilemmas.length + step })
    : undefined;
  const next = behind > 0 ? () => setBehind(behind - 1) : moveOn;
  const back = shown > 0 ? () => setBehind(behind + 1) : undefined;
  const label = t('results.label', { step: shown + 1, total });
  if (anonymous) {
    return <RankingScreen game={game} onMoveOn={moveOn} onLeave={leave} onShowQr={onShowQr} />;
  }
  if (shown >= total - 1) {
    return (
      <RankingScreen
        game={game}
        label={label}
        onMoveOn={next}
        onBack={back}
        onLeave={leave}
        onShowQr={onShowQr}
      />
    );
  }

  const titles = game.results?.titles ?? [];
  const title = titles[shown];
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
      onMoveOn={next}
      onBack={back}
    >
      {title ? (
        <TitleScreen key={shown} game={game} title={title} position={shown} />
      ) : (
        <KnowsScreen game={game} />
      )}
      <GroupProgressSheet game={game} open={isGroupOpen} onOpenChange={setIsGroupOpen} />
    </ResultsStep>
  );
}

function ResultsStep({
  header,
  onMoveOn,
  onBack,
  children,
}: {
  readonly header: ReactNode;
  readonly onMoveOn: (() => void) | undefined;
  readonly onBack: (() => void) | undefined;
  readonly children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.screen}>
      {header}
      <main className={styles.main} tabIndex={0}>
        {children}
      </main>
      <footer className={styles.footer}>
        {onBack && (
          <button type="button" className={styles.back} onClick={onBack}>
            {t('results.back')}
          </button>
        )}
        {onMoveOn && (
          <button type="button" className={styles.next} onClick={onMoveOn}>
            {t('results.next')}
          </button>
        )}
      </footer>
    </div>
  );
}
