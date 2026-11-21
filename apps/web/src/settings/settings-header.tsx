import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Icon } from '../components/icon.tsx';
import styles from './settings.module.css';

/** The header of a screen of the settings: the way back to where it was opened from, and its name. */
export function SettingsHeader({ title, back }: { readonly title: string; readonly back: string }) {
  const { t } = useTranslation();
  return (
    <header className={styles.header}>
      <Link className={styles.back} to={back} aria-label={t('appSettings.back')}>
        <Icon name="arrowBack" />
      </Link>
      <h1 className={styles.heading}>{title}</h1>
    </header>
  );
}
