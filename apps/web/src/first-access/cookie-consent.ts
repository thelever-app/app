/** Where the device keeps that it answered the cookie manager, so it is not asked on every open. */
const ANSWERED_KEY = 'thelever.cookieConsentAnswered';
/**
 * Where the device keeps whether its ads may be personalised: only for an adult who accepted it in
 * the cookie manager and whose browser does not send Global Privacy Control (RES-43). The ads read
 * it; nothing else does.
 */
export const PERSONALISED_ADS_KEY = 'thelever.personalisedAds';

/** How long the first access waits for the cookie manager of Google before going on without it. */
const MANAGER_TIMEOUT_MS = 20_000;

/** The purposes of TCF a personalised ad needs: a profile for ads, and ads chosen with it. */
const PERSONALISED_AD_PURPOSES = [3, 4] as const;

/** Of the TCF data the cookie manager sends, what the first access reads. */
interface TcData {
  readonly eventStatus?: string;
  readonly gdprApplies?: boolean;
  readonly purpose?: { readonly consents?: Readonly<Record<string, boolean>> };
}

type TcfApi = (
  command: string,
  version: number,
  callback: (data: TcData, success: boolean) => void,
) => void;

declare global {
  interface Window {
    __tcfapi?: TcfApi;
  }
  interface Navigator {
    /** Global Privacy Control, which a browser sends to reject the sale or sharing of data. */
    readonly globalPrivacyControl?: boolean;
  }
}

export function hasAnsweredCookies(storage: Storage = localStorage): boolean {
  try {
    return storage.getItem(ANSWERED_KEY) === 'yes';
  } catch {
    return false;
  }
}

export function sendsGlobalPrivacyControl(navigatorOf: Navigator = navigator): boolean {
  return navigatorOf.globalPrivacyControl === true;
}

/** The cookie manager of Google for the publisher, as AdSense publishes it (Privacy & messaging). */
export function cookieManagerUrl(adsenseClient: string): string {
  return `https://fundingchoicesmessages.google.com/i/${adsenseClient.replace(/^ca-/, '')}?ers=1`;
}

/**
 * Shows the cookie manager of Google and resolves once the person answers it, or at once if they
 * answered it before; whether they accepted personalised ads. Where the law does not ask for it,
 * there is nothing to answer, and it resolves when the manager says so. If the manager does not
 * load, the first access goes on as if personalised ads were rejected.
 */
export function askCookieManager(
  adsenseClient: string,
  doc: Document = document,
): Promise<boolean> {
  return new Promise((resolve) => {
    const win = doc.defaultView ?? window;
    let settled = false;
    const settle = (personalised: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(personalised);
    };
    const timeout = setTimeout(() => settle(false), MANAGER_TIMEOUT_MS);
    const listen = () => {
      if (!win.__tcfapi) {
        settle(false);
        return;
      }
      win.__tcfapi('addEventListener', 2, (data, success) => {
        if (!success) return;
        if (data.gdprApplies === false) settle(true);
        else if (data.eventStatus === 'useractioncomplete' || data.eventStatus === 'tcloaded') {
          const consents = data.purpose?.consents ?? {};
          settle(PERSONALISED_AD_PURPOSES.every((purpose) => consents[purpose] === true));
        }
      });
    };
    const script = doc.createElement('script');
    script.async = true;
    script.src = cookieManagerUrl(adsenseClient);
    script.addEventListener('load', listen);
    script.addEventListener('error', () => settle(false));
    doc.head.append(script);
  });
}

/**
 * What the device keeps once the cookie manager is answered: that it was answered, and whether
 * its ads may be personalised.
 */
export function rememberCookieAnswer(personalised: boolean, storage: Storage = localStorage): void {
  try {
    storage.setItem(ANSWERED_KEY, 'yes');
    storage.setItem(PERSONALISED_ADS_KEY, personalised ? 'yes' : 'no');
  } catch {
    // A device that keeps nothing asks again next time, which is what protects the person.
  }
}
