import {
  changeCookieChoices,
  rememberCookieAnswer,
  sendsGlobalPrivacyControl,
} from '../first-access/cookie-consent.ts';

/**
 * Opens the cookie manager of Google again and keeps on the device what the person accepts now:
 * a minor's ads, or those of a browser with Global Privacy Control, are never personalised.
 */
export async function changeCookies(adsenseClient: string, underEighteen: boolean): Promise<void> {
  const accepted = await changeCookieChoices(adsenseClient);
  rememberCookieAnswer(accepted && !sendsGlobalPrivacyControl() && !underEighteen);
}
