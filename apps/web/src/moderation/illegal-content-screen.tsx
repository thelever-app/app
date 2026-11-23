import { useActionState } from 'react';
import { useTranslation } from 'react-i18next';
import { SubmitButton } from '../components/submit-button.tsx';
import { deviceLanguage } from '../i18n/i18n.ts';
import { useRoomApi } from '../room/room-api-context.tsx';
import { codeOf } from '../screens/room-error.ts';
import { useAccessGate } from '../screens/use-access-gate.tsx';
import screen from '../screens/screen.module.css';
import form from '../screens/form.module.css';
import styles from './illegal-content-screen.module.css';

/** What the last send gave: nothing yet, the notice received, or why it was not. */
type Sent =
  | { readonly step: 'writing'; readonly error?: 'invalid' | 'tooMany' | 'failed' }
  | { readonly step: 'received'; readonly withEmail: boolean };

/**
 * /denunciar: anyone, without the app and without its first access, sends a notice of illegal
 * content: the link or the code of the dilemma, or the room and the nickname, why it is illegal and,
 * if they want, their name and email, declaring that they act in good faith. They get the
 * acknowledgement on the screen and, with an email, there too.
 */
export function IllegalContentScreen() {
  const { t, i18n } = useTranslation();
  const api = useRoomApi();
  const { withAccess, accessCodeScreen } = useAccessGate();
  const [sent, send, isPending] = useActionState(
    async (_before: Sent, data: FormData): Promise<Sent> => {
      const text = (name: string) => String(data.get(name) ?? '').trim();
      const email = text('email');
      const name = text('name');
      try {
        const done = await withAccess(async () => {
          await api.sendIllegalContentNotice({
            reference: text('reference'),
            explanation: text('explanation'),
            ...(name && { name }),
            ...(email && { email }),
            language: deviceLanguage(i18n),
            goodFaith: true,
          });
          return true;
        });
        // Back from the access code: the form stays as the person left it.
        if (!done) return { step: 'writing' };
        return { step: 'received', withEmail: email !== '' };
      } catch (failure) {
        const code = codeOf(failure);
        if (code === 'too-many-notices') return { step: 'writing', error: 'tooMany' };
        if (code === 'invalid-notice' || code === 'invalid-message') {
          return { step: 'writing', error: 'invalid' };
        }
        return { step: 'writing', error: 'failed' };
      }
    },
    { step: 'writing' },
  );

  if (sent.step === 'received') {
    return (
      <div className={screen.screen}>
        <main className={styles.main}>
          <h1 className={styles.title}>{t('illegalNotice.receivedTitle')}</h1>
          <p role="status" className={styles.text}>
            {t('illegalNotice.receivedText')}{' '}
            {sent.withEmail ? t('illegalNotice.receivedEmail') : t('illegalNotice.receivedNoEmail')}
          </p>
          <p className={styles.text}>{t('illegalNotice.authorities')}</p>
          <a className={styles.another} href="">
            {t('illegalNotice.another')}
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className={screen.screen}>
      <main className={styles.main}>
        <h1 className={styles.title}>{t('illegalNotice.title')}</h1>
        <p className={styles.text}>{t('illegalNotice.intro')}</p>
        <form action={send} className={form.form}>
          <label className={form.field}>
            {t('illegalNotice.reference')}
            <input
              className={form.input}
              name="reference"
              required
              maxLength={500}
              placeholder={t('illegalNotice.referencePlaceholder')}
            />
          </label>
          <label className={form.field}>
            {t('illegalNotice.explanation')}
            <textarea
              className={`${form.input} ${styles.explanation}`}
              name="explanation"
              required
              rows={4}
              maxLength={2000}
              placeholder={t('illegalNotice.explanationPlaceholder')}
            />
          </label>
          <label className={form.field}>
            {t('illegalNotice.name')}
            <input
              className={form.input}
              name="name"
              maxLength={100}
              autoComplete="name"
              placeholder={t('illegalNotice.namePlaceholder')}
            />
          </label>
          <label className={form.field}>
            {t('illegalNotice.email')}
            <input
              className={form.input}
              name="email"
              type="email"
              maxLength={254}
              autoComplete="email"
              placeholder={t('illegalNotice.emailPlaceholder')}
            />
          </label>
          <label className={styles.goodFaith}>
            <input className={styles.check} type="checkbox" name="goodFaith" required />
            <span>{t('illegalNotice.goodFaith')}</span>
          </label>
          {sent.error && (
            <p role="alert" className={form.error}>
              {t(`illegalNotice.${sent.error}`)}
            </p>
          )}
          <SubmitButton
            pending={isPending}
            text={isPending ? t('illegalNotice.sending') : t('illegalNotice.send')}
          />
          <p className={styles.note}>{t('illegalNotice.note')}</p>
        </form>
      </main>
      {accessCodeScreen}
    </div>
  );
}
