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
import { CONTACT_EMAIL, CONTACT_PATH, CREDITS_PATH, FUNDING_PATH } from './settings-paths.ts';
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
export function SettingsScreen() {
  const { t, i18n } = useTranslation();
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
  const screenOf = (icon: IconName, title: string, to: string) => (
    <Link className={styles.row} to={to}>
      <Icon name={icon} size={22} />
      <RowText title={title} />
      <Icon name="chevronRight" size={20} />
    </Link>
  );

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
          {page('policy', t('appSettings.privacyPolicy'), legal.privacy)}
          {page('gavel', t('appSettings.terms'), legal.terms)}
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
    </div>
  );
}
