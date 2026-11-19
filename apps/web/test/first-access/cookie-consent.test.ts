import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  askCookieManager,
  cookieManagerUrl,
  hasAnsweredCookies,
  PERSONALISED_ADS_KEY,
  rememberCookieAnswer,
  sendsGlobalPrivacyControl,
} from '../../src/first-access/cookie-consent.ts';

afterEach(() => {
  delete window.__tcfapi;
  localStorage.clear();
  document.head.innerHTML = '';
});

/** The cookie manager loads and calls back what the person answered. */
function loadsAndAnswers(data: object): void {
  vi.spyOn(document.head, 'append').mockImplementation((script) => {
    window.__tcfapi = (_command, _version, callback) => callback(data as never, true);
    (script as HTMLScriptElement).dispatchEvent(new Event('load'));
  });
}

describe('cookieManagerUrl', () => {
  it('should be the cookie manager of Google for the publisher', () => {
    // Act & Assert
    expect(cookieManagerUrl('ca-pub-1234')).toBe(
      'https://fundingchoicesmessages.google.com/i/pub-1234?ers=1',
    );
  });
});

describe('askCookieManager', () => {
  it('should allow personalised ads only with consent to the purposes they need', async () => {
    // Arrange
    loadsAndAnswers({
      eventStatus: 'useractioncomplete',
      purpose: { consents: { 1: true, 3: true, 4: true } },
    });

    // Act & Assert
    await expect(askCookieManager('ca-pub-1234')).resolves.toBe(true);
  });

  it('should not allow them when the person rejected those purposes', async () => {
    // Arrange
    loadsAndAnswers({ eventStatus: 'useractioncomplete', purpose: { consents: { 1: true } } });

    // Act & Assert
    await expect(askCookieManager('ca-pub-1234')).resolves.toBe(false);
  });

  it('should go on without them when the manager does not load', async () => {
    // Arrange
    vi.spyOn(document.head, 'append').mockImplementation((script) => {
      (script as HTMLScriptElement).dispatchEvent(new Event('error'));
    });

    // Act & Assert
    await expect(askCookieManager('ca-pub-1234')).resolves.toBe(false);
  });
});

describe('rememberCookieAnswer', () => {
  it('should keep that the cookie manager was answered, and what it means for the ads', () => {
    // Act
    rememberCookieAnswer(false);

    // Assert
    expect(hasAnsweredCookies()).toBe(true);
    expect(localStorage.getItem(PERSONALISED_ADS_KEY)).toBe('no');
  });
});

describe('sendsGlobalPrivacyControl', () => {
  it('should read the signal of the browser', () => {
    // Act & Assert
    expect(sendsGlobalPrivacyControl({ globalPrivacyControl: true } as Navigator)).toBe(true);
    expect(sendsGlobalPrivacyControl({} as Navigator)).toBe(false);
  });
});
