import type { FirstAccessResponseDto } from '@thelever-app/protocol';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matchPath, useLocation } from 'react-router';
import { useRoomApi } from '../room/room-api-context.tsx';
import screen from '../screens/screen.module.css';
import { useAccessGate } from '../screens/use-access-gate.tsx';
import { AgeScreen } from './age-screen.tsx';
import { CookieStep } from './cookie-step.tsx';
import { hasAnsweredCookies } from './cookie-consent.ts';
import { LegalScreen } from './legal-screen.tsx';
import { StopScreen } from './stop-screen.tsx';
import { WelcomeScreen } from './welcome-screen.tsx';
import styles from './first-access.module.css';

interface FirstAccessGateProps {
  /** The publisher of the cookie manager of Google; none where there are no cookies to ask about. */
  readonly adsenseClient: string | undefined;
  /** The app, once the first access is done: at the address the person opened. */
  readonly children: ReactNode;
}

/**
 * Every opening of the app goes through here. The room server says where the first access of
 * this device is, and the gate shows its step: the welcome and the age, the stop under the
 * minimum age or in a blocked country, the legal documents, and the cookie manager. Once done,
 * the address the person opened, a link to a room or a dilemma, is the one they reach.
 */
export function FirstAccessGate({ adsenseClient, children }: FirstAccessGateProps) {
  const { t } = useTranslation();
  const api = useRoomApi();
  const { withAccess, accessCodeScreen } = useAccessGate();
  const { pathname } = useLocation();
  const [status, setStatus] = useState<FirstAccessResponseDto>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(false);
  const [host, setHost] = useState<string>();
  const [cookies, setCookies] = useState(hasAnsweredCookies);
  const code = matchPath('/join/:code', pathname)?.params.code;

  useEffect(() => {
    let active = true;
    withAccess(() => api.openApp()).then(
      (opened) => {
        if (!active) return;
        if (opened) setStatus(opened);
        else setFailed(true);
      },
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [api, withAccess, attempt]);

  // Whoever comes from the link of a room sees who invites them; without it, the welcome of always.
  const welcoming = status?.step === 'age' && !started;
  useEffect(() => {
    if (!welcoming || code === undefined) return;
    let active = true;
    api.previewRoom(code).then(
      (preview) => active && setHost(preview.hostNickname),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [api, code, welcoming]);

  const cookiesDone = useCallback(() => setCookies(true), []);

  if (accessCodeScreen) return accessCodeScreen;
  if (!status) {
    return (
      <div className={screen.screen}>
        <main className={styles.stop} role={failed ? 'alert' : 'status'}>
          {failed ? (
            <>
              <p className={styles.muted}>{t('roomErrors.unknown')}</p>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setFailed(false);
                  setAttempt((before) => before + 1);
                }}
              >
                {t('firstAccess.retry')}
              </button>
            </>
          ) : (
            <p className={styles.muted}>{t('firstAccess.loading')}</p>
          )}
        </main>
      </div>
    );
  }
  switch (status.step) {
    case 'blocked-country':
    case 'under-minimum-age':
      return <StopScreen reason={status.step} />;
    case 'age':
      return started ? (
        <AgeScreen onDeclared={setStatus} />
      ) : (
        <WelcomeScreen host={host} onStart={() => setStarted(true)} />
      );
    case 'documents':
      return <LegalScreen status={status} onAccepted={setStatus} />;
    case 'done':
      return cookies ? (
        children
      ) : (
        <CookieStep
          adsenseClient={adsenseClient}
          underEighteen={status.underEighteen}
          onDone={cookiesDone}
        />
      );
  }
}
