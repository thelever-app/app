import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import mascotWaving from '../assets/brand/mascot-waving.svg';
import { Icon } from '../components/icon.tsx';
import { SupportCard } from '../donations/support-card.tsx';
import { InstallOffer } from '../install/install-offer.tsx';
import { ModerationNotices } from '../moderation/moderation-notices.tsx';
import { SETTINGS_PATH } from '../settings/settings-paths.ts';
import { CreateRoomForm } from './create-room-form.tsx';
import screen from './screen.module.css';
import styles from './home-screen.module.css';

/** Creating a room is a step of the start, without an address of its own; the code has /join. */
type Step = 'start' | 'create';

/** /: create a room, or join one with its code. */
export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createHintId = useId();
  const joinHintId = useId();
  const [step, setStep] = useState<Step>('start');
  const back = (
    <button
      type="button"
      className={styles.back}
      aria-label={t('home.back')}
      onClick={() => setStep('start')}
    >
      <Icon name="arrowBack" />
    </button>
  );

  if (step === 'create') {
    return (
      <div className={screen.screen}>
        <div className={styles.step} data-step="create">
          {back}
          <h1 className={styles.stepTitle}>{t('createRoom.title')}</h1>
          <CreateRoomForm />
        </div>
      </div>
    );
  }

  // The start spans the whole window, with the header of the public web, so the app reads as part
  // of it; what is below it keeps the column of the app.
  return (
    <div className={screen.screen} data-layout="wide">
      <header className={styles.header}>
        {/* As on the public web, the logo takes to its home: a page of its own, not of the app. */}
        <a className={styles.brand} href="/">
          <img src={mascotWaving} alt="" width={32} height={32} />
          TheLever.app
        </a>
        <Link className={styles.settings} to={SETTINGS_PATH} aria-label={t('appSettings.open')}>
          <Icon name="settings" />
        </Link>
      </header>
      <div aria-hidden="true" className={styles.stripe} />
      <main className={styles.main} data-column>
        <h1 className={styles.title}>{t('home.title')}</h1>
        {/* Under each button, who presses it: only one person of the group creates the room. */}
        <button
          type="button"
          className={styles.create}
          aria-describedby={createHintId}
          onClick={() => setStep('create')}
        >
          <Icon name="addCircle" size={26} />
          <span className={styles.buttonText}>
            {t('home.create')}
            <span id={createHintId} aria-hidden="true" className={styles.buttonHint}>
              {t('home.createHint')}
            </span>
          </span>
        </button>
        <button
          type="button"
          className={styles.join}
          aria-describedby={joinHintId}
          onClick={() => void navigate('/join')}
        >
          <Icon name="pin" />
          <span className={styles.buttonText}>
            {t('home.joinWithCode')}
            <span id={joinHintId} aria-hidden="true" className={styles.buttonHint}>
              {t('home.joinHint')}
            </span>
          </span>
        </button>
        <SupportCard />
        <InstallOffer />
      </main>
      <ModerationNotices />
    </div>
  );
}
