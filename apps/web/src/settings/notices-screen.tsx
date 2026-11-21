import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import screen from '../screens/screen.module.css';
import { SettingsHeader } from './settings-header.tsx';
import { CREDITS_PATH } from './settings-paths.ts';
import styles from './settings.module.css';

/** Where the build leaves the notices of the third-party code of the app (licence-notices.ts). */
const NOTICES_FILE = '/third-party-licences.json';

/** The notice of one third-party package, as the build writes it. */
interface LicenceNotice {
  readonly name: string;
  readonly version: string;
  readonly licence: string;
  readonly author: string | null;
  readonly text: string | null;
}

/** What the build writes: the notices, and once each the text of the licences some ship without. */
interface NoticesFile {
  readonly notices: readonly LicenceNotice[];
  readonly licences: Readonly<Record<string, string>>;
}

type Notices =
  | { readonly state: 'loading' }
  | { readonly state: 'failed' }
  | ({ readonly state: 'loaded' } & NoticesFile);

/**
 * /settings/credits/notices: each library of the app with its licence and the text it ships, as
 * its licence asks to keep. They are only loaded here, as they weigh more than the rest.
 */
export function NoticesScreen({ fetchNotices = fetch }: { readonly fetchNotices?: typeof fetch }) {
  const { t } = useTranslation();
  const [notices, setNotices] = useState<Notices>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchNotices(NOTICES_FILE)
      .then((response) => {
        if (!response.ok) throw new Error(`${NOTICES_FILE} answered ${response.status}`);
        return response.json() as Promise<NoticesFile>;
      })
      .then(
        (loaded) => active && setNotices({ state: 'loaded', ...loaded }),
        () => active && setNotices({ state: 'failed' }),
      );
    return () => {
      active = false;
    };
  }, [fetchNotices, attempt]);

  return (
    <div className={screen.screen}>
      <SettingsHeader title={t('credits.notices.title')} back={CREDITS_PATH} />
      <main className={styles.cards}>
        {notices.state === 'loading' && (
          <p role="status" className={styles.cardText}>
            {t('credits.notices.loading')}
          </p>
        )}
        {notices.state === 'failed' && (
          <div role="alert" className={styles.card}>
            <p className={styles.cardText}>{t('credits.notices.failed')}</p>
            <button
              type="button"
              className={styles.cardLink}
              onClick={() => {
                setNotices({ state: 'loading' });
                setAttempt((before) => before + 1);
              }}
            >
              {t('credits.notices.retry')}
            </button>
          </div>
        )}
        {notices.state === 'loaded' &&
          notices.notices.map(({ name, version, licence, author, text }) => (
            <section key={`${name}@${version}`} className={styles.card}>
              <h2 className={styles.cardTitle}>
                {name} {version}
              </h2>
              <p className={styles.cardText}>{t('credits.notices.licence', { licence })}</p>
              {/* A package without a text of its own: its author and the licence as published. */}
              {!text && author && <p className={styles.cardText}>Copyright (c) {author}</p>}
              <pre className={styles.licence}>{text ?? notices.licences[licence]}</pre>
            </section>
          ))}
      </main>
    </div>
  );
}
