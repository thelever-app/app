import type { GameStateDto, ReportReasonDto } from '@thelever-app/protocol';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GroupProgressSheet } from '../components/group-progress-sheet.tsx';
import { ProgressStrip } from '../components/progress-strip.tsx';
import { personInTheGapOf } from '../game/dilemma-text.tsx';
import { GameMenu } from '../game/game-menu.tsx';
import { GameToast } from '../game/game-toast.tsx';
import { PredictCard, type Predictions } from '../game/predict-card.tsx';
import { ReportSheet } from '../game/report-sheet.tsx';
import type { AnswerDraft } from '../room/room-provider.tsx';
import { DilemmaCard } from './dilemma-card.tsx';
import styles from './screen.module.css';
import toast from './dilemma-screen.module.css';

interface DilemmaScreenProps {
  readonly game: GameStateDto;
  /** Where to start; by default, the first dilemma the player has neither completed nor skipped. */
  readonly initialPosition?: number | undefined;
  readonly onAnswer: (answer: AnswerDraft) => void;
  /** The player moved on from the last dilemma. */
  readonly onDone: () => void;
  readonly onLaunchReveal: () => void;
  readonly onReport: (dilemmaId: string, reason: ReportReasonDto, comment: string) => void;
  readonly onSkip: (dilemmaId: string) => void;
  readonly onLeave: () => void;
}

/** What the screen holds of the answer to each dilemma, from what the room keeps. */
type Drafts = ReadonlyMap<string, { readonly vote: string } & Predictions>;

function draftsOf(game: GameStateDto): Drafts {
  return new Map(
    game.answers.map(({ dilemmaId, vote, matchPrediction, votePredictions }) => [
      dilemmaId,
      { vote, matchPrediction, votePredictions },
    ]),
  );
}

/**
 * The dilemmas one by one: the vote and, in a nominal room, the predictions on a step of their
 * own. The screen moves on before the room confirms, and sends the answer with every change.
 */
export function DilemmaScreen({
  game,
  initialPosition,
  onAnswer,
  onDone,
  onLaunchReveal,
  onReport,
  onSkip,
  onLeave,
}: DilemmaScreenProps) {
  const { t } = useTranslation();
  const skipped = new Set(
    game.didNotVote.filter(({ reason }) => reason === 'reported').map(({ dilemmaId }) => dilemmaId),
  );
  const playable = game.dilemmas
    .map((dilemma, index) => ({ dilemma, index }))
    .filter(({ dilemma }) => !skipped.has(dilemma.dilemmaId))
    .map(({ index }) => index);
  const self = game.players.find(({ playerId }) => playerId === game.playerId);
  const lastPosition = game.dilemmas.length - 1;

  const [position, setPosition] = useState(
    () => initialPosition ?? Math.min(self?.progress ?? 0, lastPosition),
  );
  const [step, setStep] = useState<'vote' | 'predict'>('vote');
  const [drafts, setDrafts] = useState<Drafts>(() => draftsOf(game));
  const [isSendingLast, setIsSendingLast] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportedHere, setReportedHere] = useState<
    { readonly dilemmaId: string; readonly offensive: boolean } | undefined
  >(undefined);

  const dilemma = game.dilemmas[position]!;
  const { dilemmaId } = dilemma;
  const draft = drafts.get(dilemmaId);
  const savedVote = game.answers.find((answer) => answer.dilemmaId === dilemmaId)?.vote;
  const isNominal = dilemma.predictionSubset.length > 0;
  const isHost = game.hostId === game.playerId;
  const person = personInTheGapOf(game, dilemma);
  const previous = playable.filter((index) => index < position).at(-1);
  const next = playable.find((index) => index > position);
  const reported =
    reportedHere?.dilemmaId === dilemmaId ||
    game.reports.some((report) => report.dilemmaId === dilemmaId);
  const hostName = game.players.find(({ playerId }) => playerId === game.hostId)?.nickname ?? '';

  const keep = (answer: { readonly vote: string } & Predictions) => {
    setDrafts(new Map(drafts).set(dilemmaId, answer));
    onAnswer({ dilemmaId, ...answer, votePredictions: [...answer.votePredictions] });
  };

  const moveOn = (sending: boolean) => {
    setStep('vote');
    if (next !== undefined) {
      setPosition(next);
      return;
    }
    // The waiting screen comes with the state the room sends back; until then, no second send.
    if (sending) setIsSendingLast(true);
    onDone();
  };

  const menu = (
    <GameMenu
      isHost={isHost}
      reported={reported}
      onLaunchReveal={onLaunchReveal}
      onShowGroup={() => setIsGroupOpen(true)}
      onReport={() => setIsReportOpen(true)}
      onLeave={onLeave}
    />
  );

  return (
    <div className={styles.screen}>
      <ProgressStrip
        position={position}
        players={game.players}
        dilemmaCount={game.dilemmas.length}
        game={game}
        menu={step === 'vote' ? menu : undefined}
        step={step}
      />
      {step === 'vote' ? (
        <DilemmaCard
          // A new card when the dilemma changes, and again when the room confirms its vote.
          key={`${dilemmaId}:${savedVote ?? ''}`}
          dilemma={dilemma}
          personInTheGap={person}
          savedVote={draft?.vote ?? savedVote}
          canGoBack={previous !== undefined}
          isSending={next === undefined && !isNominal && isSendingLast}
          onBack={() => {
            if (previous === undefined) return;
            setPosition(previous);
          }}
          onContinue={(vote) => {
            const changed = vote !== draft?.vote;
            const predictions = draft ?? { matchPrediction: null, votePredictions: [] };
            if (changed) keep({ ...predictions, vote });
            if (isNominal) setStep('predict');
            else moveOn(changed);
          }}
        />
      ) : (
        <PredictCard
          key={dilemmaId}
          dilemma={dilemma}
          vote={draft?.vote ?? ''}
          predictions={draft ?? { matchPrediction: null, votePredictions: [] }}
          players={game.players}
          personInTheGap={person}
          isSending={next === undefined && isSendingLast}
          onChange={(predictions) => keep({ vote: draft?.vote ?? '', ...predictions })}
          onBack={() => setStep('vote')}
          onNext={() => moveOn(true)}
        />
      )}
      <GroupProgressSheet
        players={game.players}
        dilemmaCount={game.dilemmas.length}
        open={isGroupOpen}
        onOpenChange={setIsGroupOpen}
      />
      <ReportSheet
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        onSend={(reason, comment) => {
          onReport(dilemmaId, reason, comment);
          setReportedHere({ dilemmaId, offensive: reason === 'offensive' });
          setIsReportOpen(false);
        }}
      />
      {reportedHere?.dilemmaId === dilemmaId ? (
        <GameToast>
          <p className={toast.thanks}>
            <strong className={toast.signal}>{t('reportSent.thanks')}</strong>{' '}
            {t('reportSent.text')}
          </p>
          {reportedHere.offensive && (
            <p className={toast.skipRow}>
              <span className={toast.muted}>{t('reportSent.canSkip')}</span>
              <button
                type="button"
                className={toast.skip}
                onClick={() => {
                  onSkip(dilemmaId);
                  setReportedHere(undefined);
                  moveOn(true);
                }}
              >
                {t('reportSent.skip')}
              </button>
            </p>
          )}
        </GameToast>
      ) : (
        game.totalTimeRanOut && (
          <GameToast hazard>
            <strong className={toast.signal}>{t('timeUp.title')}</strong>
            <span>
              {isHost ? t('timeUp.stragglerHost') : t('timeUp.straggler', { host: hostName })}
            </span>
          </GameToast>
        )
      )}
    </div>
  );
}
