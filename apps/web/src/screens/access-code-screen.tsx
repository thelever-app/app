import { Dialog } from 'radix-ui';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/icon.tsx';
import { SubmitButton } from '../components/submit-button.tsx';
import form from './form.module.css';
import styles from './access-code-screen.module.css';

interface AccessCodeScreenProps {
  /** Whether the room server turned down the code the player last entered. */
  readonly refused: boolean;
  /** While the room server checks the code. */
  readonly checking: boolean;
  readonly onEnter: (code: string) => void;
  /** Back to where the player was, with what they had filled in; not while the code is checked. */
  readonly onBack: () => void;
}

/**
 * TheLever is being tested: only whoever has the access code may create a room or join one. It
 * covers the screen the player was on when the room server asked for the code, until they enter
 * or go back. There is no way to ask for a code.
 */
export function AccessCodeScreen({ refused, checking, onEnter, onBack }: AccessCodeScreenProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  // The refusal is about the code the player entered: typing again, or entering it again, clears it.
  const [entered, setEntered] = useState<string>();
  const invalid = refused && !checking && entered === code;
  const empty = code.trim() === '';

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (empty || checking) return;
    setEntered(code);
    onEnter(code);
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !checking && onBack()}>
      <Dialog.Portal>
        <Dialog.Content className={styles.screen}>
          <form className={styles.body} onSubmit={onSubmit}>
            <Dialog.Close asChild>
              <button
                type="button"
                className={styles.back}
                aria-label={t('home.back')}
                disabled={checking}
              >
                <Icon name="arrowBack" />
              </button>
            </Dialog.Close>
            <span aria-hidden="true" className={styles.lock}>
              <Icon name="lock" size={30} />
            </span>
            <Dialog.Title className={styles.title}>{t('accessCode.title')}</Dialog.Title>
            <Dialog.Description className={styles.lead}>{t('accessCode.text')}</Dialog.Description>
            <label className={form.field}>
              {t('accessCode.label')}
              <input
                className={styles.input}
                name="accessCode"
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={invalid}
                data-empty={empty}
                aria-describedby="access-code-error"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <div id="access-code-error" role="alert" className={styles.alert}>
              {invalid && (
                <p className={styles.error}>
                  <Icon name="block" size={20} />
                  <span>
                    <strong>{t('accessCode.invalid')}</strong> {t('accessCode.check')}
                  </span>
                </p>
              )}
            </div>
            <div className={form.submit}>
              <SubmitButton
                pending={checking}
                disabled={empty}
                text={checking ? t('accessCode.entering') : t('accessCode.enter')}
              />
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
