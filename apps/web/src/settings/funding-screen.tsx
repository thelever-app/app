import { useTranslation } from 'react-i18next';
import { FundingPoints } from '../first-access/funding-points.tsx';
import screen from '../screens/screen.module.css';
import { SettingsHeader } from './settings-header.tsx';
import { SETTINGS_PATH } from './settings-paths.ts';
import styles from './settings.module.css';

/** /settings/funding: how TheLever is funded, as the game consent tells it too. */
export function FundingScreen() {
  const { t } = useTranslation();
  return (
    <div className={screen.screen}>
      <SettingsHeader title={t('firstAccess.funding.title')} back={SETTINGS_PATH} />
      <main className={styles.page}>
        <FundingPoints />
      </main>
    </div>
  );
}
