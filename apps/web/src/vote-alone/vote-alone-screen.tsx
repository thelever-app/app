import {
  type DilemmaPreviewResponseDto,
  GAP_MARKER,
  LanguageDto,
  type WorldResultResponseDto,
} from '@thelever-app/protocol';
import { useActionState, useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Icon } from '../components/icon.tsx';
import { DilemmaText } from '../game/dilemma-text.tsx';
import { HOME_PATH } from '../home-path.ts';
import { RoomApiError } from '../room/room-api.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import screen from '../screens/screen.module.css';
import { useAccessGate } from '../screens/use-access-gate.tsx';
import { type WorldVote, type WorldVotes, worldVotes } from './world-votes.ts';
import styles from './vote-alone-screen.module.css';

/** The votes alone of this device, kept in its storage. */
const DEVICE_VOTES = worldVotes();

/** Where the visitor starts the prediction: half the world. */
const FIRST_PREDICTION = 50;

/**
 * The page of the public web the link came from, to read the arguments again: only a path of the
 * web itself, /{language}/…, never another site, whatever the link says.
 */
function webPathOf(back: string | null): string | undefined {
  if (!back) return undefined;
  const [, language, rest] = /^\/([a-z]{2})\/([^/\\][^\\]*)?$/.exec(back) ?? [];
  return language && LanguageDto.safeParse(language).success && !rest?.startsWith('/')
    ? back
    : undefined;
}

type Preview =
  | { readonly status: 'loading' }
  | { readonly status: 'found'; readonly dilemma: DilemmaPreviewResponseDto }
  | { readonly status: 'not-found' }
  | { readonly status: 'failed' };

interface VoteAloneScreenProps {
  /** Where the device keeps what it voted alone; its storage unless a test gives another. */
  readonly votes?: WorldVotes;
}

/**
 * /vote/:publicId, where «Vote and see what the world did» of a public page leads: the dilemma to
 * vote alone and predict which share of the world voted the same, and then the world result. The
 * device keeps its vote and its prediction, and asks for the result with them.
 */
export function VoteAloneScreen({ votes = DEVICE_VOTES }: VoteAloneScreenProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { publicId = '' } = useParams();
  const [search] = useSearchParams();
  const back = webPathOf(search.get('back'));
  const api = useRoomApi();
  const kept = useSyncExternalStore(votes.subscribe, () => votes.voteOf(publicId));
  // The answer keeps the public id it answers: while it answers another one, the screen is loading.
  const [answer, setAnswer] = useState<{ readonly publicId: string; readonly preview: Preview }>();
  // Back to the page of the web it came from, outside the app, or to the start of the app.
  const leave = () => (back ? window.location.assign(back) : void navigate(HOME_PATH));
  // Whoever came by a link without the access code writes it before seeing the dilemma.
  const { withAccess, accessCodeScreen } = useAccessGate(leave);

  useEffect(() => {
    let current = true;
    withAccess(() => api.previewDilemma(publicId)).then(
      (dilemma) => {
        // Without a dilemma, the visitor went back from the access code, and leaves the screen.
        if (current && dilemma) setAnswer({ publicId, preview: { status: 'found', dilemma } });
      },
      (error: unknown) => {
        if (!current) return;
        const notFound = error instanceof RoomApiError && error.code === 'dilemma-not-found';
        setAnswer({ publicId, preview: { status: notFound ? 'not-found' : 'failed' } });
      },
    );
    return () => {
      current = false;
    };
  }, [api, publicId, withAccess]);
  const preview: Preview = answer?.publicId === publicId ? answer.preview : { status: 'loading' };
  // A vote of an earlier version of the dilemma does not count for this one: it is voted again.
  const vote =
    preview.status === 'found' && kept?.version === preview.dilemma.version ? kept : undefined;

  return (
    <div className={screen.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.back} aria-label={t('home.back')} onClick={leave}>
          <Icon name="arrowBack" />
        </button>
        {preview.status === 'found' && (
          <span className={styles.category}>{t(`categories.${preview.dilemma.category}`)}</span>
        )}
      </header>
      {preview.status === 'loading' && <p className={styles.note}>{t('voteAlone.loading')}</p>}
      {preview.status === 'not-found' && (
        <p className={styles.note} role="alert">
          {t('voteAlone.notFound')}
        </p>
      )}
      {preview.status === 'failed' && (
        <p className={styles.note} role="alert">
          {t('roomErrors.unknown')}
        </p>
      )}
      {preview.status === 'found' &&
        (vote ? (
          <WorldResultView
            publicId={publicId}
            dilemma={preview.dilemma}
            vote={vote}
            back={back}
            withAccess={withAccess}
          />
        ) : (
          <VoteForm
            publicId={publicId}
            dilemma={preview.dilemma}
            votes={votes}
            withAccess={withAccess}
          />
        ))}
      {accessCodeScreen}
    </div>
  );
}

type WithAccess = <T>(call: () => Promise<T>) => Promise<T | undefined>;

interface VoteFormProps {
  readonly publicId: string;
  readonly dilemma: DilemmaPreviewResponseDto;
  readonly votes: WorldVotes;
  readonly withAccess: WithAccess;
}

/** The dilemma, its options to vote in private and the prediction of the share of the world. */
function VoteForm({ publicId, dilemma, votes, withAccess }: VoteFormProps) {
  const { t } = useTranslation();
  const api = useRoomApi();
  const [optionId, setOptionId] = useState<string>();
  const [prediction, setPrediction] = useState(FIRST_PREDICTION);
  const [failed, send, sending] = useActionState(async () => {
    if (!optionId) return false;
    try {
      const voted = await withAccess(async () => {
        await api.voteAlone(publicId, optionId);
        return true;
      });
      // The visitor went back from the access code: nothing was voted.
      if (!voted) return false;
    } catch (error) {
      // A vote the server already counted, from this device or another one, is a vote all the same.
      if (!(error instanceof RoomApiError && error.code === 'already-voted')) return true;
    }
    votes.save(publicId, { optionId, prediction, version: dilemma.version });
    return false;
  }, false);
  const someone = t('voteAlone.someoneInYourGroup');

  return (
    <form action={send} className={styles.form} data-testid="vote-alone">
      <main className={styles.main}>
        <div className={styles.dilemma}>
          {dilemma.name && <h1 className={styles.name}>{dilemma.name}</h1>}
          <p className={styles.text}>
            <DilemmaText text={dilemma.text} personInTheGap={someone} />
          </p>
        </div>
        <fieldset className={styles.options}>
          <legend className={styles.legend}>{t('voteAlone.yourVote')}</legend>
          {dilemma.options.map((option) => (
            <button
              key={option.optionId}
              type="button"
              className={styles.option}
              aria-pressed={option.optionId === optionId}
              onClick={() => setOptionId(option.optionId)}
            >
              <DilemmaText text={option.text} personInTheGap={someone} />
            </button>
          ))}
        </fieldset>
        <div className={styles.prediction}>
          <label htmlFor="world-prediction" className={styles.question}>
            {t('voteAlone.prediction')}
          </label>
          <div className={styles.slider}>
            <input
              id="world-prediction"
              type="range"
              min={0}
              max={100}
              step={5}
              value={prediction}
              onChange={(event) => setPrediction(Number(event.target.value))}
              aria-valuetext={t('voteAlone.percent', { value: prediction })}
            />
            <output htmlFor="world-prediction" className={styles.value}>
              {t('voteAlone.percent', { value: prediction })}
            </output>
          </div>
        </div>
        <p className={styles.private}>{t('voteAlone.private')}</p>
        {failed && (
          <p className={styles.private} role="alert">
            {t('roomErrors.unknown')}
          </p>
        )}
      </main>
      <footer className={styles.footer}>
        <button type="submit" className={styles.see} disabled={!optionId || sending}>
          {sending ? t('voteAlone.sending') : t('voteAlone.see')}
        </button>
      </footer>
    </form>
  );
}

interface WorldResultViewProps {
  readonly publicId: string;
  readonly dilemma: DilemmaPreviewResponseDto;
  readonly vote: WorldVote;
  readonly back: string | undefined;
  readonly withAccess: WithAccess;
}

/** How the world voted, for the vote and the prediction of the device, and where to go from there. */
function WorldResultView({ publicId, dilemma, vote, back, withAccess }: WorldResultViewProps) {
  const { t } = useTranslation();
  const api = useRoomApi();
  const [result, setResult] = useState<WorldResultResponseDto | 'failed'>();

  useEffect(() => {
    let current = true;
    withAccess(() => api.worldResult(publicId, vote.optionId, vote.prediction)).then(
      (answer) => {
        if (current && answer) setResult(answer);
      },
      () => {
        if (current) setResult('failed');
      },
    );
    return () => {
      current = false;
    };
  }, [api, publicId, vote, withAccess]);

  // In the bars, the gap "someone in the group" in words, as everywhere a group is not playing.
  const textOf = (optionId: string) =>
    (dilemma.options.find((option) => option.optionId === optionId)?.text ?? '').replaceAll(
      GAP_MARKER,
      t('voteAlone.someoneInYourGroup'),
    );

  return (
    <main className={styles.main} data-testid="world-result">
      {dilemma.name && <h1 className={styles.resultName}>{dilemma.name}</h1>}
      {/* Read out as it comes, since the form the visitor sent is gone. */}
      <div role="status" className={styles.status}>
        {result === undefined && <p className={styles.note}>{t('voteAlone.loadingResult')}</p>}
        {result === 'failed' && (
          <p className={styles.note} role="alert">
            {t('roomErrors.unknown')}
          </p>
        )}
        {result !== undefined && result !== 'failed' && !result.shown && (
          <div className={styles.few}>
            <Icon name="hourglass" />
            <span className={styles.fewText}>
              <span className={styles.fewTitle}>{t('voteAlone.fewTitle')}</span>
              <span>
                {t('voteAlone.fewBody', { count: result.answers, needed: result.needed })}
              </span>
            </span>
          </div>
        )}
        {result !== undefined && result !== 'failed' && result.shown && (
          <>
            <div className={styles.headline}>
              <span className={styles.share}>
                {t('voteAlone.sameAsYou', { percentage: result.yours.percentage })}
              </span>
              <span>
                {t('voteAlone.thoughtLikeYou')}{' '}
                {result.yours.predictionOff === 0
                  ? t('voteAlone.predictionRight', { prediction: vote.prediction })
                  : t('voteAlone.predictionOff', {
                      prediction: vote.prediction,
                      count: result.yours.predictionOff,
                    })}
              </span>
            </div>
            <ul className={styles.bars}>
              {result.options.map(({ optionId, percentage }) => {
                const yours = optionId === vote.optionId;
                return (
                  <li key={optionId} className={styles.bar} data-yours={yours}>
                    <span className={styles.barLabel}>
                      <span className={styles.barOption}>
                        {yours
                          ? t('voteAlone.yours', { option: textOf(optionId) })
                          : textOf(optionId)}
                      </span>
                      <span className={styles.barValue}>
                        {t('voteAlone.percent', { value: percentage })}
                      </span>
                    </span>
                    <span className={styles.track} aria-hidden="true">
                      <span className={styles.fill} style={{ width: `${percentage}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className={styles.answers}>{t('voteAlone.answers', { count: result.answers })}</p>
          </>
        )}
      </div>
      <div className={styles.actions}>
        <Link className={styles.play} to={`/new/${publicId}`}>
          <Icon name="groups" size={20} />
          {t('voteAlone.play')}
        </Link>
        {back && (
          <a className={styles.arguments} href={back}>
            {t('voteAlone.arguments')}
            <Icon name="openInNew" size={20} />
          </a>
        )}
      </div>
    </main>
  );
}
