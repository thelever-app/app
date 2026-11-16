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
});
