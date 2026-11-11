import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { Icon } from '../components/icon.tsx';
import { SubmitButton } from '../components/submit-button.tsx';
import { CODE_LENGTH, CodeField } from './code-field.tsx';
import screen from './screen.module.css';
import styles from './home-screen.module.css';

/**
 * /join: the code of a room, which goes through with the button once it is complete, to the same
 * screen the link and the QR lead to. Until then the button says how many characters are missing.
 * The history keeps the code it entered with: whoever comes back finds it, and enters again.
 */
export function JoinCodeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const kept = (useLocation().state as { code?: string } | null)?.code;
  const [code, setCode] = useState(kept ?? '');
  const complete = code.length === CODE_LENGTH;
  const enter = (next: string) => {
    void navigate('/join', { replace: true, state: { code: next } });
    void navigate(`/join/${next}`, { state: { fromCode: true } });
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
        <CodeField code={code} onChange={setCode} />
        <p className={styles.hint}>{t('joinCode.hint')}</p>
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
