import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CreditsScreen } from '../../src/settings/credits-screen.tsx';
import { FundingScreen } from '../../src/settings/funding-screen.tsx';
import { NoticesScreen } from '../../src/settings/notices-screen.tsx';
import { renderAtRoute, TEST_DONATION_URL } from '../support/routing.tsx';

describe('FundingScreen', () => {
  it('should tell the ads, research perhaps and the donations, which give no advantage, with the way to donate', async () => {
    // Arrange
    const { t } = await renderAtRoute(<FundingScreen />);

    // Act
    const donate = screen.getByRole('link', { name: t('firstAccess.funding.donations.label') });

    // Assert
    expect(screen.getByText(t('firstAccess.funding.ads.text'))).toBeDefined();
    expect(screen.getByText(t('firstAccess.funding.research.text'))).toBeDefined();
    expect(screen.getByText(t('firstAccess.funding.donations.text'))).toBeDefined();
    expect(donate.getAttribute('href')).toBe(TEST_DONATION_URL);
    expect(donate.getAttribute('target')).toBe('_blank');
  });
});

describe('CreditsScreen', () => {
  it('should credit DiceBear and link the notices and the source code', async () => {
    // Arrange
    const { t, location } = await renderAtRoute(<CreditsScreen />);

    // Act
    const code = screen.getByRole('link', {
      name: t('appSettings.outside', { name: t('credits.code.link') }),
    });
    fireEvent.click(screen.getByRole('link', { name: t('credits.libraries.link') }));

    // Assert
    expect(screen.getByText(t('credits.avatars.text'))).toBeDefined();
    expect(t('credits.avatars.text')).toContain('DiceBear');
    expect(code.getAttribute('href')).toBe('https://github.com/thelever-app/app');
    expect(location()).toBe('/settings/credits/notices');
  });
});

describe('NoticesScreen', () => {
  it('should show each library with its licence and the text it ships', async () => {
    // Arrange
    const notices = [
      {
        name: 'test-library',
        version: '1.0.0',
        licence: 'MIT',
        author: null,
        text: 'TestLicenceText',
      },
      {
        name: 'test-icons',
        version: '0.1.0',
        licence: 'Apache-2.0',
        author: 'TestAuthor',
        text: null,
      },
    ];
    const licences = { 'Apache-2.0': 'TestApacheText' };
    const fetchNotices = (async () => Response.json({ notices, licences })) as typeof fetch;

    // Act
    const { t } = await renderAtRoute(<NoticesScreen fetchNotices={fetchNotices} />);

    // Assert
    expect(await screen.findByRole('heading', { name: 'test-library 1.0.0' })).toBeDefined();
    expect(screen.getByText('TestLicenceText')).toBeDefined();
    expect(screen.getByText(t('credits.notices.licence', { licence: 'Apache-2.0' }))).toBeDefined();
    expect(screen.getByText('Copyright (c) TestAuthor')).toBeDefined();
    expect(screen.getByText('TestApacheText')).toBeDefined();
  });

  it('should offer to try again when the notices do not load', async () => {
    // Arrange
    let attempts = 0;
    const fetchNotices = (async () => {
      attempts += 1;
      return attempts === 1
        ? new Response(null, { status: 503 })
        : Response.json({
            notices: [
              {
                name: 'test-library',
                version: '1.0.0',
                licence: 'MIT',
                author: null,
                text: 'TestText',
              },
            ],
            licences: {},
          });
    }) as typeof fetch;
    const { t } = await renderAtRoute(<NoticesScreen fetchNotices={fetchNotices} />);

    // Act
    fireEvent.click(await screen.findByRole('button', { name: t('credits.notices.retry') }));

    // Assert
    expect(await screen.findByRole('heading', { name: 'test-library 1.0.0' })).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
