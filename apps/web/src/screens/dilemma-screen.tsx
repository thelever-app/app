import {
  DistributionPredictionVO,
  type PredictedShare,
} from '@thelever-app/game/distribution-prediction';
import type { GameStateDto, ReportReasonDto } from '@thelever-app/protocol';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GroupProgressSheet } from '../components/group-progress-sheet.tsx';
import { isAnonymous } from '../components/players.ts';
import { ProgressStrip } from '../components/progress-strip.tsx';
import { personInTheGapOf } from '../game/dilemma-text.tsx';
import { DistributionPredictCard } from '../game/distribution-predict-card.tsx';
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
 * The dilemma of the round: the vote and, on a step of their own, the predictions: of each vote in
 * a nominal room, of the distribution in an anonymous one. The vote goes to the room on
 * «Continuar», so it counts even if the time runs out while predicting. The vote predictions go
 * when the player leaves their step, with «Listo» or back to the vote, never with each tap; the
 * distribution prediction, each time the player lets go of a bar, so the one on the screen counts
 * if the time runs out; «Listo» says it is done. The person in the gap does not vote: they only
 * have the step of the predictions, with the menu and who has answered, as the vote has them.
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
  const aboutYou = dilemma.personInTheGap === game.playerId;
  const total = game.dilemmas.length;

  const [step, setStep] = useState<'vote' | 'predict'>(aboutYou ? 'predict' : 'vote');
  const [vote, setVote] = useState(saved?.vote ?? undefined);
  // What the predictions go with: the vote, or none for the person in the gap.
  const answerVote = aboutYou ? null : (vote ?? '');
  const backToTheVote = aboutYou ? undefined : () => setStep('vote');
  const withTheGroup = step === 'vote' || aboutYou;
  const [predictions, setPredictions] = useState<Predictions>(saved ?? NO_PREDICTIONS);
  // Where the room starts it too: the even split, in the order the player sees the options.
  const [distribution, setDistribution] = useState<readonly PredictedShare[]>(
    () =>
      saved?.distributionPrediction ??
      DistributionPredictionVO.even(dilemma.options.map(({ optionId }) => optionId)).shares,
  );
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
        label={t(
          aboutYou
            ? 'progressStrip.aboutYou'
            : step === 'vote'
              ? 'progressStrip.position'
              : anonymous
                ? 'progressStrip.predictingDistribution'
                : 'progressStrip.predicting',
          { position: position + 1, total },
        )}
        menu={withTheGroup ? menu : undefined}
        showGroup={withTheGroup}
      />
      {step === 'vote' ? (
        <DilemmaCard
          dilemma={dilemma}
          personInTheGap={person}
          savedVote={vote}
          anonymous={anonymous}
          onContinue={(chosen) => {
            setVote(chosen);
            if (anonymous) {
              if (chosen !== saved?.vote) onAnswer({ dilemmaId, vote: chosen });
              setStep('predict');
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
      ) : anonymous ? (
        <DistributionPredictCard
          dilemma={dilemma}
          vote={answerVote}
          prediction={distribution}
          personInTheGap={person}
          isSending={isSending}
          onChange={setDistribution}
          onRelease={(released) => {
            setDistribution(released);
            onAnswer({ dilemmaId, vote: answerVote, distributionPrediction: [...released] });
          }}
          onBack={backToTheVote}
          onReady={() =>
            confirm({
              dilemmaId,
              vote: answerVote,
              distributionPrediction: [...distribution],
              ready: true,
            })
          }
        />
      ) : (
        <PredictCard
          dilemma={dilemma}
          vote={answerVote}
          predictions={predictions}
          playersToPredict={game.playersToPredict}
          players={game.players}
          personInTheGap={person}
          isSending={isSending}
          onChange={setPredictions}
          onBack={
            backToTheVote &&
            (() => {
              if (!samePredictions(predictions, saved ?? NO_PREDICTIONS)) {
                onAnswer({
                  dilemmaId,
                  vote: answerVote,
                  votePredictions: [...predictions.votePredictions],
                });
              }
              backToTheVote();
            })
          }
          onNext={() =>
            confirm({
              dilemmaId,
              vote: answerVote,
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
