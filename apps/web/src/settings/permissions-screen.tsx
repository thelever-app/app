import type { MyDataResponseDto } from '@thelever-app/protocol';
import { Dialog } from 'radix-ui';
import { useActionState, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Icon } from '../components/icon.tsx';
import { sendsGlobalPrivacyControl } from '../first-access/cookie-consent.ts';
import { useUnderEighteen } from '../first-access/device-age.tsx';
import { HOME_PATH } from '../home-path.ts';
import sheet from '../lobby/sheet.module.css';
import { useRoomApi } from '../room/room-api-context.tsx';
import screen from '../screens/screen.module.css';
import { changeCookies } from './change-cookies.ts';
import { SettingsHeader } from './settings-header.tsx';
import { FUNDING_PATH, SETTINGS_PATH } from './settings-paths.ts';
import styles from './settings.module.css';

interface PermissionsScreenProps {
  /** The publisher of the cookie manager of Google; none where there are no cookies to change. */
  readonly adsenseClient: string | undefined;
}

/**
 * /settings/permissions: the game consent, which is withdrawn after a warning; the objection to
 * product analytics, which takes effect at once; and the cookie manager of Google, opened again to
 * change what was accepted. Nobody of the group sees any of it.
 */
export function PermissionsScreen({ adsenseClient }: PermissionsScreenProps) {
  const { t } = useTranslation();
  const api = useRoomApi();
  const underEighteen = useUnderEighteen();
  const gpc = sendsGlobalPrivacyControl();
  const [mine, setMine] = useState<MyDataResponseDto>();
  const [failed, setFailed] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    let active = true;
    api.myData().then(
      (data) => active && setMine(data),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [api]);

  const toggleAnalytics = () => {
    if (!mine) return;
    const objects = !mine.objectsToAnalytics;
    setFailed(false);
    setMine({ ...mine, objectsToAnalytics: objects });
    api.objectToAnalytics(objects).catch(() => {
      setMine({ ...mine, objectsToAnalytics: !objects });
      setFailed(true);
    });
  };

  const analyticsOn = mine !== undefined && !mine.objectsToAnalytics;
  return (
    <div className={screen.screen}>
      <SettingsHeader title={t('permissions.title')} back={SETTINGS_PATH} />
      <main className={styles.cards}>
        <p className={styles.cardText}>{t('permissions.lead')}</p>
        {failed && (
          <p className={styles.cardText} role="alert">
            {t('permissions.failed')}
          </p>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={mine?.gameConsent === 'given'}
          disabled={!mine}
          className={styles.permission}
          onClick={() => setWithdrawing(true)}
        >
          <span className={styles.permissionIcon}>
            <Icon name="sportsEsports" size={20} />
          </span>
          <span className={styles.rowText}>
            <span>{t('permissions.game')}</span>
            <span className={styles.rowDetail}>{t('permissions.gameOn')}</span>
          </span>
          <span
            className={styles.toggle}
            data-on={mine?.gameConsent === 'given'}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={analyticsOn}
          disabled={!mine}
          className={styles.permission}
          onClick={toggleAnalytics}
        >
          <span className={styles.permissionIcon}>
            <Icon name="monitoring" size={20} />
          </span>
          <span className={styles.rowText}>
            <span>{t('permissions.analytics')}</span>
            <span className={styles.rowDetail}>
              {analyticsOn ? t('permissions.analyticsOn') : t('permissions.analyticsOff')}
            </span>
          </span>
          <span className={styles.toggle} data-on={analyticsOn} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.permission}
          disabled={!adsenseClient}
          onClick={() => adsenseClient && void changeCookies(adsenseClient, underEighteen)}
        >
          <span className={styles.permissionIcon}>
            <Icon name="cookie" size={20} />
          </span>
          <span className={styles.rowText}>
            <span>{t('permissions.cookies')}</span>
            <span className={styles.rowDetail}>
              {gpc ? t('permissions.cookiesGpc') : t('permissions.cookiesText')}
            </span>
          </span>
          <Icon name="chevronRight" size={22} />
        </button>
        <Link className={styles.cardLink} to={FUNDING_PATH}>
          {t('appSettings.funding')}
        </Link>
      </main>
      {withdrawing && <WithdrawSheet onClose={() => setWithdrawing(false)} />}
    </div>
  );
}

/**
 * Before withdrawing the game consent the player is told what it does. Withdrawn, the app opens
 * again from the start, which asks for it before anything else.
 */
function WithdrawSheet({ onClose }: { readonly onClose: () => void }) {
  const { t } = useTranslation();
  const api = useRoomApi();
  const [failed, withdraw, pending] = useActionState(async () => {
    try {
      await api.withdrawGameConsent();
      window.location.assign(HOME_PATH);
      return false;
    } catch {
      return true;
    }
  }, false);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={sheet.overlay} />
        <Dialog.Content className={`${sheet.sheet} ${sheet.roomy}`}>
          <form action={withdraw} className={styles.sheetForm}>
            <div aria-hidden="true" className={sheet.handle} />
            <Dialog.Title className={sheet.title}>{t('permissions.withdraw.title')}</Dialog.Title>
            <Dialog.Description asChild>
              <ul className={styles.points}>
                <li className={styles.point}>
                  <Icon name="block" size={20} />
                  <span>{t('permissions.withdraw.blocked')}</span>
                </li>
                <li className={styles.point}>
                  <Icon name="delete" size={20} />
                  <span>{t('permissions.withdraw.deleted')}</span>
                </li>
              </ul>
            </Dialog.Description>
            {failed && (
              <p className={styles.cardText} role="alert">
                {t('permissions.failed')}
              </p>
            )}
            <button type="submit" className={sheet.dark} disabled={pending}>
              {t('permissions.withdraw.confirm')}
            </button>
            <Dialog.Close className={sheet.secondary}>
              {t('permissions.withdraw.cancel')}
            </Dialog.Close>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
