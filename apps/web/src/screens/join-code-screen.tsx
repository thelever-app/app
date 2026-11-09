import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Icon } from '../components/icon.tsx';
import { SubmitButton } from '../components/submit-button.tsx';
import { CODE_LENGTH, CodeField } from './code-field.tsx';
import screen from './screen.module.css';
import styles from './home-screen.module.css';

/**
 * /join: the code of a room, which goes through as soon as it is complete, to the same screen the
 * link and the QR lead to. The button below says how many characters are missing, and enters
 * again if the player comes back.
 */
export function JoinCodeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const complete = code.length === CODE_LENGTH;
  const enter = (next: string) => void navigate(`/join/${next}`, { state: { fromCode: true } });

  const onChange = (next: string) => {
    setCode(next);
    if (next.length === CODE_LENGTH) enter(next);
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (complete) enter(code);
  };

  return (
    <div className={screen.screen}>
      <form className={styles.step} onSubmit={onSubmit}>
        <button
          type="button"
          className={styles.back}
          aria-label={t('home.back')}
          onClick={() => void navigate('/')}
        >
          <Icon name="arrowBack" />
        </button>
        <h1 className={styles.stepTitle}>{t('joinCode.title')}</h1>
        <p className={styles.lead}>{t('joinCode.text')}</p>
        <CodeField code={code} onChange={onChange} />
        <p className={styles.hint}>{complete ? t('joinCode.entering') : t('joinCode.hint')}</p>
        <div className={styles.submit}>
          <SubmitButton
            pending={false}
            disabled={!complete}
            text={
              complete
                ? t('joinCode.enter')
                : t('joinCode.missing', { count: CODE_LENGTH - code.length })
            }
          />
        </div>
      </form>
    </div>
  );
}
