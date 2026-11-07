import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { CodeField } from './code-field.tsx';
import { CreateRoomForm } from './create-room-form.tsx';
import screen from './screen.module.css';
import styles from './home-screen.module.css';

/** Creating a room and typing a code are steps of the start, without an address of their own. */
type Step = 'start' | 'create' | 'code';

/** /: create a room, or join one with its code. */
export function HomeScreen() {
  const { t } = useTranslation();
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
        <div className={styles.step}>
          {back}
          <h1 className={styles.stepTitle}>{t('createRoom.title')}</h1>
          <CreateRoomForm />
        </div>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <div className={screen.screen}>
        <div className={styles.step}>
          {back}
          <h1 className={styles.stepTitle}>{t('joinCode.title')}</h1>
          <p className={styles.lead}>{t('joinCode.text')}</p>
          <CodeField />
          <p className={styles.hint}>{t('joinCode.hint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={screen.screen}>
      <header className={styles.header}>
        <span className={styles.brand}>TheLever.app</span>
      </header>
      <div aria-hidden="true" className={styles.stripe} />
      <main className={styles.main}>
        <h1 className={styles.title}>{t('home.title')}</h1>
        <button type="button" className={styles.create} onClick={() => setStep('create')}>
          <Icon name="addCircle" size={26} />
          {t('home.create')}
        </button>
        <button type="button" className={styles.join} onClick={() => setStep('code')}>
          <Icon name="pin" />
          {t('home.joinWithCode')}
        </button>
      </main>
    </div>
  );
}
