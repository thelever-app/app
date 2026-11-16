import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildSite } from '../build-site.ts';
import { InMemorySiteFiles } from '../files/in-memory-site-files.ts';
import { publishSite } from '../files/publish-site.ts';
import { cachedSite } from '../serve/cached-site.ts';
import { createSiteApp } from '../serve/site-app.ts';
import { LANGUAGES } from '../texts/index.ts';

async function appWithASite() {
  const files = new InMemorySiteFiles();
  await publishSite(
    buildSite({ dilemmas: [], withdrawn: [] }, LANGUAGES, {
      origin: 'https://thelever.test',
      appBase: '',
    }),
    files,
  );
  return createSiteApp({
    site: cachedSite(files, 60_000),
    environment: 'prod',
    origin: 'https://thelever.test',
  });
}

describe('the service of the public web', () => {
  it('should answer with the pages of the site, as respond says', async () => {
    // Act
    const response = await request(await appWithASite()).get('/es/');

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.headers['cache-control']).toContain('s-maxage');
    expect(response.text).toContain('Dilemas morales para jugar con tu gente');
  });

  it('should serve the stylesheet, the fonts and the illustrations of the pages', async () => {
    // Arrange
    const app = await appWithASite();

    // Act
    const css = await request(app).get('/_site/site.css');
    const font = await request(app).get('/_site/fonts/barlow-400.woff2');
    const mascot = await request(app).get('/_site/mascot-waving.svg');

    // Assert
    expect(css.status).toBe(200);
    expect(font.headers['content-type']).toBe('font/woff2');
    expect(mascot.headers['content-type']).toBe('image/svg+xml');
  });

  it('should answer 503 while no site has been generated', async () => {
    // Arrange
    const app = createSiteApp({
      site: cachedSite(new InMemorySiteFiles(), 60_000),
      environment: 'prod',
      origin: 'https://thelever.test',
    });

    // Act
    const response = await request(app).get('/es/');

    // Assert
    expect(response.status).toBe(503);
  });

  it('should answer 404 to an asset that does not exist, whatever its name', async () => {
    // Act
    const response = await request(await appWithASite()).get('/_site/__proto__');

    // Assert
    expect(response.status).toBe(404);
  });

  it('should read the site again before answering that an address does not exist', async () => {
    // Arrange: the instance read the site before the dilemma was published.
    const files = new InMemorySiteFiles();
    const config = { origin: 'https://thelever.test', appBase: '' };
    await publishSite(buildSite({ dilemmas: [], withdrawn: [] }, LANGUAGES, config), files);
    let now = 0;
    const app = createSiteApp({
      site: cachedSite(files, 300_000, () => now),
      environment: 'prod',
      origin: config.origin,
    });
    await request(app).get('/es/');
    await publishSite(
      buildSite(
        {
          dilemmas: [
            {
              number: 7,
              dilemmaId: 'dlm-7',
              publicId: 'TestPublicId',
              language: 'es',
              name: 'El tranvía',
              text: 'TestText',
              options: [
                { optionId: 'a', text: 'TestA' },
                { optionId: 'b', text: 'TestB' },
              ],
              category: 'life-and-death',
              indexable: false,
            },
          ],
          withdrawn: [],
        },
        LANGUAGES,
        config,
      ),
      files,
    );

    // Act
    now = 60_000;
    const response = await request(app).get('/es/vida-y-muerte/el-tranvia-7');

    // Assert
    expect(response.status).toBe(200);
  });
});
