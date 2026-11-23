import type { LanguageDto } from '@thelever-app/protocol';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Icon, type IconName } from '../components/icon.tsx';
import { useDonationUrl } from '../config/donation-url.tsx';
import { legalPathsIn } from '../first-access/legal-links.ts';
import { HOME_PATH } from '../home-path.ts';
import screen from '../screens/screen.module.css';
import { useMuted } from '../sound/sound-context.tsx';
import { LANGUAGE_NAMES, LanguageSheet } from './language-sheet.tsx';
import { SettingsHeader } from './settings-header.tsx';
import { useUnderEighteen } from '../first-access/device-age.tsx';
import { changeCookies } from './change-cookies.ts';
import { DataDeletedScreen } from './data-deleted-screen.tsx';
import { DeleteDataSheet } from './delete-data-sheet.tsx';
import {
  CONTACT_EMAIL,
  CONTACT_PATH,
  CREDITS_PATH,
  FUNDING_PATH,
  PERMISSIONS_PATH,
  YOUR_DATA_PATH,
} from './settings-paths.ts';
import styles from './settings.module.css';

/** What a row of the settings says: its name and, below, what it is about. */
function RowText({ title, detail }: { readonly title: string; readonly detail?: string }) {
  return (
    <span className={styles.rowText}>
      <span>{title}</span>
      {detail && <span className={styles.rowDetail}>{detail}</span>}
    </span>
  );
}

/** A block of the settings, with its heading. */
function Block({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className={styles.block} aria-label={title}>
      <h2 className={styles.blockTitle}>{title}</h2>
      <div className={styles.rows}>{children}</div>
    </section>
  );
}

/**
 * /settings, from the start: the way to support TheLever first, then each block with the rows that
 * work today. The age is neither shown nor changed here: it cannot be.
 */
export function SettingsScreen({
  adsenseClient,
}: {
  /** The publisher of the cookie manager of Google; none where there are no cookies to change. */
  readonly adsenseClient?: string | undefined;
}) {
  const { t, i18n } = useTranslation();
  const underEighteen = useUnderEighteen();
  const donationUrl = useDonationUrl();
  const [muted, setMuted] = useMuted();
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const supportText = useId();
  const legal = legalPathsIn(i18n.resolvedLanguage ?? 'es');
  const language = LANGUAGE_NAMES[(i18n.resolvedLanguage ?? 'es') as LanguageDto];
  const page = (icon: IconName, title: string, href: string) => (
    <a
      className={styles.row}
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={t('appSettings.outside', { name: title })}
    >
      <Icon name={icon} size={22} />
      <RowText title={title} />
      <Icon name="openInNew" size={20} />
    </a>
  );
  const screenOf = (icon: IconName, title: string, to: string, detail?: string) => (
    <Link className={styles.row} to={to}>
      <Icon name={icon} size={22} />
      <RowText title={title} {...(detail !== undefined && { detail })} />
      <Icon name="chevronRight" size={20} />
    </Link>
  );
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  if (deleted) return <DataDeletedScreen />;

  return (
    <div className={screen.screen}>
      <SettingsHeader title={t('appSettings.title')} back={HOME_PATH} />
      <main className={styles.main}>
        <a
          className={styles.support}
          href={donationUrl}
          target="_blank"
          rel="noopener"
          aria-label={t('appSettings.support.label')}
          aria-describedby={supportText}
        >
          <Icon name="favorite" size={22} />
          <span className={styles.rowText}>
            <span>{t('appSettings.support.title')}</span>
            <span id={supportText} className={styles.rowDetail}>
              {t('appSettings.support.text')}
            </span>
          </span>
          <Icon name="openInNew" size={20} />
        </a>
        <Block title={t('appSettings.game')}>
          <button type="button" className={styles.row} onClick={() => setChoosingLanguage(true)}>
            <Icon name="translate" size={22} />
            <RowText title={t('appSettings.language')} detail={language} />
            <Icon name="chevronRight" size={20} />
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={!muted}
            className={styles.row}
            onClick={() => setMuted(!muted)}
          >
            <Icon name={muted ? 'volumeOff' : 'volumeUp'} size={22} />
            <RowText title={t('appSettings.sound')} detail={t('appSettings.soundText')} />
            <span className={styles.toggle} data-on={!muted} aria-hidden="true" />
          </button>
        </Block>
        <Block title={t('appSettings.privacy')}>
          {screenOf(
            'verifiedUser',
            t('appSettings.permissions'),
            PERMISSIONS_PATH,
            t('appSettings.permissionsDetail'),
          )}
          {screenOf(
            'key',
            t('appSettings.yourData'),
            YOUR_DATA_PATH,
            t('appSettings.yourDataDetail'),
          )}
          {page('policy', t('appSettings.privacyPolicy'), legal.privacy)}
          {page('gavel', t('appSettings.terms'), legal.terms)}
          <button
            type="button"
            className={styles.row}
            disabled={!adsenseClient}
            onClick={() => adsenseClient && void changeCookies(adsenseClient, underEighteen)}
          >
            <Icon name="cookie" size={22} />
            <RowText title={t('appSettings.cookies')} detail={t('appSettings.cookiesDetail')} />
            <Icon name="chevronRight" size={20} />
          </button>
          <button type="button" className={styles.row} onClick={() => setDeleting(true)}>
            <Icon name="delete" size={22} />
            <RowText
              title={t('appSettings.deleteData')}
              detail={t('appSettings.deleteDataDetail')}
            />
            <Icon name="chevronRight" size={20} />
          </button>
        </Block>
        <Block title={t('appSettings.about')}>
          {screenOf('payments', t('appSettings.funding'), FUNDING_PATH)}
          <Link className={styles.row} to={CONTACT_PATH}>
            <Icon name="mail" size={22} />
            <RowText title={t('appSettings.contact')} detail={CONTACT_EMAIL} />
            <Icon name="chevronRight" size={20} />
          </Link>
          {screenOf('info', t('appSettings.credits'), CREDITS_PATH)}
          {page('description', t('appSettings.legalNotice'), legal.legalNotice)}
        </Block>
      </main>
      <LanguageSheet open={choosingLanguage} onOpenChange={setChoosingLanguage} />
      {deleting && (
        <DeleteDataSheet onClose={() => setDeleting(false)} onDeleted={() => setDeleted(true)} />
      )}
    </div>
  );
}
