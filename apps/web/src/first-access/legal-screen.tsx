import type { FirstAccessResponseDto } from '@thelever-app/protocol';
import { useActionState, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../components/icon.tsx';
import { useRoomApi } from '../room/room-api-context.tsx';
import screen from '../screens/screen.module.css';
import { FundingSheet } from './funding-sheet.tsx';
import { legalPathsIn } from './legal-links.ts';
import styles from './first-access.module.css';

/** The five points of the game consent, before its statement (RES-40). */
const POINTS: readonly (readonly [
  'play' | 'notSold' | 'group' | 'deleted' | 'decide',
  IconName,
])[] = [
  ['play', 'sportsEsports'],
  ['notSold', 'block'],
  ['group', 'groups'],
  ['deleted', 'autoDelete'],
  ['decide', 'tune'],
];

interface LegalScreenProps {
  readonly status: FirstAccessResponseDto;
  /** Where the first access is once what the person accepted is kept. */
  readonly onAccepted: (status: FirstAccessResponseDto) => void;
}

/**
 * The legal documents still to accept. The terms of use and the game consent, each with its own
 * box, unchecked (RES-40); terms that changed so much they must be accepted again, on a screen of
 * their own (RES-71); and a game consent that must be given again, with a notice that it changed
 * (RF-145). Without them, nothing of the app is reachable.
 */
export function LegalScreen({ status, onAccepted }: LegalScreenProps) {
  const termsPending = status.pending.includes('terms-of-use');
  if (termsPending && status.changed.includes('terms-of-use')) {
    return <NewTerms status={status} onAccepted={onAccepted} />;
  }
  return <GameConsent status={status} onAccepted={onAccepted} withTerms={termsPending} />;
}

/** Terms accepted before in a version that is no longer enough. */
function NewTerms({ status, onAccepted }: LegalScreenProps) {
  const { t, i18n } = useTranslation();
  const api = useRoomApi();
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [failed, accept, pending] = useActionState(async () => {
    try {
      onAccepted(await api.acceptDocument('terms-of-use', status.current['terms-of-use']));
      return false;
    } catch {
      return true;
    }
  }, false);
  return (
    <form className={`${screen.screen} ${screen.fixed}`} action={accept}>
      <main className={styles.scroll}>
        <h1 className={styles.title}>{t('firstAccess.newTerms.title')}</h1>
        <p className={styles.muted}>{t('firstAccess.newTerms.lead')}</p>
        <a
          className={styles.link}
          href={legalPathsIn(i18n.language).terms}
          target="_blank"
          rel="noopener"
        >
          {t('firstAccess.newTerms.read')}
          <Icon name="openInNew" size={18} />
        </a>
        {declined && (
          <p className={styles.alert} role="status">
            <Trans i18nKey="firstAccess.newTerms.declined" components={{ strong: <strong /> }} />
          </p>
        )}
        {failed && (
          <p className={styles.error} role="alert">
            {t('roomErrors.unknown')}
          </p>
        )}
      </main>
      <footer className={styles.actions}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>{t('firstAccess.newTerms.check')}</span>
        </label>
        <button type="submit" className={styles.primary} disabled={!accepted || pending}>
          {t('firstAccess.newTerms.accept')}
        </button>
        <button type="button" className={styles.textButton} onClick={() => setDeclined(true)}>
          {t('firstAccess.decline')}
        </button>
      </footer>
    </form>
  );
}

/** The game consent, and before it the terms of use when they are still to accept. */
function GameConsent({
  status,
  onAccepted,
  withTerms,
}: LegalScreenProps & { readonly withTerms: boolean }) {
  const { t, i18n } = useTranslation();
  const api = useRoomApi();
  const links = legalPathsIn(i18n.language);
  const [terms, setTerms] = useState(false);
  const [consent, setConsent] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [funding, setFunding] = useState(false);
  const changed = status.changed.includes('game-consent');
  const ready = consent && (!withTerms || terms);

  const [failed, accept, pending] = useActionState(async () => {
    try {
      // Each one apart, in the order they are asked for: the terms, then the game consent.
      if (withTerms) await api.acceptDocument('terms-of-use', status.current['terms-of-use']);
      onAccepted(await api.acceptDocument('game-consent', status.current['game-consent']));
      return false;
    } catch {
      return true;
    }
  }, false);

  return (
    <form className={`${screen.screen} ${screen.fixed}`} action={accept}>
      <main className={styles.scroll}>
        {!changed && (
          <span className={styles.stepOf}>{t('firstAccess.stepOf', { step: 2, total: 2 })}</span>
        )}
        <h1 className={styles.title}>{t('firstAccess.consent.title')}</h1>
        {changed && (
          <p className={styles.note} role="status">
            <Trans i18nKey="firstAccess.consent.changed" components={{ strong: <strong /> }} />
          </p>
        )}
        {declined && (
          <p className={styles.alert} role="status">
            <Trans i18nKey="firstAccess.consent.declined" components={{ strong: <strong /> }} />
          </p>
        )}
        <ul className={styles.points}>
          {POINTS.map(([point, icon]) => (
            <li key={point} className={styles.point} data-point={point}>
              <span className={styles.pointIcon}>
                <Icon name={icon} size={20} />
              </span>
              <p className={styles.pointText}>
                <strong>{t(`firstAccess.consent.points.${point}.title`)}</strong>{' '}
                {t(`firstAccess.consent.points.${point}.text`)}
              </p>
            </li>
          ))}
        </ul>
        <a className={styles.link} href={links.privacy} target="_blank" rel="noopener">
          {t('firstAccess.consent.privacy')}
          <Icon name="openInNew" size={18} />
        </a>
        <button type="button" className={styles.link} onClick={() => setFunding(true)}>
          {t('firstAccess.consent.funding')}
          <Icon name="chevronRight" size={18} />
        </button>
        <div className={styles.checks}>
          <p className={styles.note} data-testid="consent-why">
            <Trans i18nKey="firstAccess.consent.why" components={{ strong: <strong /> }} />
          </p>
          {withTerms && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={terms}
                onChange={(event) => setTerms(event.target.checked)}
              />
              <span>
                <Trans
                  i18nKey="firstAccess.consent.terms"
                  components={{ terms: <a href={links.terms} target="_blank" rel="noopener" /> }}
                />
              </span>
            </label>
          )}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>{t('firstAccess.consent.statement')}</span>
          </label>
        </div>
        {failed && (
          <p className={styles.error} role="alert">
            {t('roomErrors.unknown')}
          </p>
        )}
      </main>
      <footer className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={!ready || pending}>
          {t('firstAccess.continue')}
        </button>
        {!ready && (
          <span className={styles.hint}>
            {withTerms ? t('firstAccess.consent.checkBoth') : t('firstAccess.consent.checkOne')}
          </span>
        )}
        <button type="button" className={styles.textButton} onClick={() => setDeclined(true)}>
          {t('firstAccess.decline')}
        </button>
      </footer>
      <FundingSheet open={funding} onOpenChange={setFunding} />
    </form>
  );
}
