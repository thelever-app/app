import type { GameStateDto, ReportReasonDto } from '@thelever-app/protocol';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GroupProgressSheet } from '../components/group-progress-sheet.tsx';
import { isAnonymous } from '../components/players.ts';
import { ProgressStrip } from '../components/progress-strip.tsx';
import { personInTheGapOf } from '../game/dilemma-text.tsx';
import { GameMenu } from '../game/game-menu.tsx';
import { Icon } from '../components/icon.tsx';
import { GameToast } from '../game/game-toast.tsx';
import { PredictCard, type Predictions } from '../game/predict-card.tsx';
import { ReportSheet } from '../game/report-sheet.tsx';
import type { AnswerDraft } from '../room/room-provider.tsx';
import { DilemmaCard } from './dilemma-card.tsx';
import styles from './screen.module.css';
import toast from './dilemma-screen.module.css';

interface DilemmaScreenProps {
  readonly game: GameStateDto;
  readonly onAnswer: (answer: AnswerDraft) => void;
  /** The player confirmed their answer with «Listo». */
  readonly onDone: () => void;
  /** Only for the host: opens «¿Revelar el dilema ya?». */
  readonly onRevealEarly: (() => void) | undefined;
  readonly onReport: (dilemmaId: string, reason: ReportReasonDto, comment: string) => void;
  readonly onSkip: (dilemmaId: string) => void;
  readonly onLeave: () => void;
  readonly onShowQr: () => void;
}

const NO_PREDICTIONS: Predictions = { votePredictions: [] };

function samePredictions(a: Predictions, b: Predictions): boolean {
  const votesOf = ({ votePredictions }: Predictions) =>
    votePredictions
      .map(({ playerId, vote }) => `${playerId}:${vote}`)
      .sort()
      .join();
  return votesOf(a) === votesOf(b);
}

/**
 * The dilemma of the round: the vote and, in a nominal room, the predictions on a step of their
 * own. The vote goes to the room on «Continuar», so it counts even if the time runs out while
 * predicting; the predictions go when the player leaves their step, with «Listo» or back to the
 * vote, never with each tap. «Listo» also confirms the vote of an anonymous room.
 */
export function DilemmaScreen({
  game,
  onAnswer,
  onDone,
  onRevealEarly,
  onReport,
  onSkip,
  onLeave,
  onShowQr,
}: DilemmaScreenProps) {
  const { t } = useTranslation();
  const { position } = game.round;
  const dilemma = game.dilemmas[position]!;
  const { dilemmaId } = dilemma;
  const saved = game.answers.find((answer) => answer.dilemmaId === dilemmaId);
  const anonymous = isAnonymous(game);
  const person = personInTheGapOf(game, dilemma);
  const total = game.dilemmas.length;

  const [step, setStep] = useState<'vote' | 'predict'>('vote');
  const [vote, setVote] = useState(saved?.vote);
  const [predictions, setPredictions] = useState<Predictions>(saved ?? NO_PREDICTIONS);
  const [isSending, setIsSending] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportedHere, setReportedHere] = useState<{ readonly offensive: boolean } | undefined>(
    undefined,
  );
  const reported =
    reportedHere !== undefined || game.reports.some((r) => r.dilemmaId === dilemmaId);

  const confirm = (answer: AnswerDraft) => {
    onAnswer(answer);
    // The waiting screen comes with the state the room sends back; until then, no second send.
    setIsSending(true);
    onDone();
  };

  const menu = (
    <GameMenu
      code={game.code}
      onShowQr={onShowQr}
      onRevealEarly={onRevealEarly}
      reported={reported}
      onShowGroup={() => setIsGroupOpen(true)}
      onReport={() => setIsReportOpen(true)}
      onLeave={onLeave}
    />
  );

  return (
    <div className={`${styles.screen} ${styles.fixed}`}>
      <ProgressStrip
        game={game}
        label={t(step === 'vote' ? 'progressStrip.position' : 'progressStrip.predicting', {
          position: position + 1,
          total,
        })}
        menu={step === 'vote' ? menu : undefined}
        showGroup={step === 'vote'}
      />
      {step === 'vote' ? (
        <DilemmaCard
          dilemma={dilemma}
          personInTheGap={person}
          savedVote={vote}
          anonymous={anonymous}
          isSending={anonymous && isSending}
          onContinue={(chosen) => {
            setVote(chosen);
            if (anonymous) {
              confirm({ dilemmaId, vote: chosen });
              return;
            }
            if (chosen !== saved?.vote) {
              onAnswer({
                dilemmaId,
                vote: chosen,
                votePredictions: [...predictions.votePredictions],
              });
            }
            setStep('predict');
          }}
        />
      ) : (
        <PredictCard
          dilemma={dilemma}
          vote={vote ?? ''}
          predictions={predictions}
          playersToPredict={game.playersToPredict}
          players={game.players}
          personInTheGap={person}
          isSending={isSending}
          onChange={setPredictions}
          onBack={() => {
            if (!samePredictions(predictions, saved ?? NO_PREDICTIONS)) {
              onAnswer({
                dilemmaId,
                vote: vote ?? '',
                votePredictions: [...predictions.votePredictions],
              });
            }
            setStep('vote');
          }}
          onNext={() =>
            confirm({
              dilemmaId,
              vote: vote ?? '',
              votePredictions: [...predictions.votePredictions],
            })
          }
        />
      )}
      <GroupProgressSheet game={game} open={isGroupOpen} onOpenChange={setIsGroupOpen} />
      <ReportSheet
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        onSend={(reason, comment) => {
          onReport(dilemmaId, reason, comment);
          setReportedHere({ offensive: reason === 'offensive' });
          setIsReportOpen(false);
        }}
      />
      {reportedHere && (
        <GameToast>
          <p className={toast.thanks}>
            <span className={toast.thanksIcon}>
              <Icon name="checkCircle" size={20} />
            </span>
            <span>
              <strong className={toast.signal}>{t('reportSent.thanks')}</strong>{' '}
              {t('reportSent.text')}
            </span>
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
                }}
              >
                {t('reportSent.skip')}
              </button>
            </p>
          )}
        </GameToast>
      )}
    </div>
  );
}
