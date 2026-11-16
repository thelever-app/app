import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import mascotWaving from '../assets/brand/mascot-waving.svg';
import { Icon } from '../components/icon.tsx';
import { CreateRoomForm } from './create-room-form.tsx';
import screen from './screen.module.css';
import styles from './home-screen.module.css';

/** Creating a room is a step of the start, without an address of its own; the code has /join. */
type Step = 'start' | 'create';

/** /: create a room, or join one with its code. */
export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      </header>
      <div aria-hidden="true" className={styles.stripe} />
      <main className={styles.main} data-column>
        <h1 className={styles.title}>{t('home.title')}</h1>
        <button type="button" className={styles.create} onClick={() => setStep('create')}>
          <Icon name="addCircle" size={26} />
          {t('home.create')}
        </button>
        <button type="button" className={styles.join} onClick={() => void navigate('/join')}>
          <Icon name="pin" />
          {t('home.joinWithCode')}
        </button>
      </main>
    </div>
  );
}
