import type { GetPublicCatalogOutput, PublicDilemma } from '@thelever-app/dilemmas';
import { describe, expect, it } from 'vitest';
import { buildSite } from '../build-site.ts';
import type { Languages } from '../pages/page.ts';
import { type Environment, respond } from '../respond.ts';
import { es } from '../texts/es.ts';

const CONFIG = { origin: 'https://thelever.test', appBase: '' };
const ENGLISH = {
  ...es,
  languageName: 'English',
  categories: { ...es.categories, 'life-and-death': { name: 'Life and death', description: '' } },
};
const LANGUAGES: Languages = new Map([
  ['es', es],
  ['en', ENGLISH],
]);

function trolley(changes: Partial<PublicDilemma> = {}): PublicDilemma {
  return {
    number: 7,
    dilemmaId: 'dlm-7',
    publicId: 'TestPublicId',
    language: 'es',
    name: 'El tranvía',
    text: '¿Desvías el tranvía hacia {gap}?',
    options: [
      { optionId: 'dlm-7-option-1', text: 'Lo desvío' },
      { optionId: 'dlm-7-option-2', text: '<b>No</b> hago nada' },
    ],
    category: 'life-and-death',
    indexable: true,
    arguments: {
      context: 'TestContext',
      options: [
        { optionId: 'dlm-7-option-1', for: 'TestFor1 de {gap}', against: 'TestAgainst1' },
        { optionId: 'dlm-7-option-2', for: 'TestFor2', against: 'TestAgainst2' },
      ],
    },
    ...changes,
  };
}

const IN_ENGLISH = trolley({
  dilemmaId: 'dlm-7-en',
  publicId: 'TestEnglishPublicId',
  language: 'en',
  name: 'The trolley',
});

function published(catalog: GetPublicCatalogOutput) {
  const { files, manifest } = buildSite(catalog, LANGUAGES, CONFIG);
  return { manifest, read: async (file: string) => files.get(file)?.body };
}

async function answer(
  path: string,
  catalog: GetPublicCatalogOutput,
  environment: Environment = 'prod',
) {
  return respond(path, published(catalog), { environment, origin: CONFIG.origin });
}

describe('the public web', () => {
  it('should give each dilemma a page in each language, which links to the others', async () => {
    // Act
    const page = await answer('/es/vida-y-muerte/el-tranvia-7', {
      dilemmas: [trolley(), IN_ENGLISH],
      withdrawn: [],
    });

    // Assert
    expect(page.status).toBe(200);
    expect(page.body).toContain(
      '<link rel="alternate" hreflang="en" href="https://thelever.test/en/life-and-death/the-trolley-7" />',
    );
    expect(page.body).toMatch(/href="\/en\/life-and-death\/the-trolley-7"\s+hreflang="en"/);
  });

  it('should show the dilemma with the gap in words, its options and its arguments, escaped', async () => {
    // Act
    const { body } = await answer('/es/vida-y-muerte/el-tranvia-7', {
      dilemmas: [trolley()],
      withdrawn: [],
    });

    // Assert
    expect(body).toContain('¿Desvías el tranvía hacia alguien de tu grupo?');
    expect(body).toContain('&lt;b&gt;No&lt;/b&gt; hago nada');
    expect(body).toContain('TestFor2');
    expect(body).toContain('TestAgainst1');
    expect(body).toContain('TestFor1 de alguien de tu grupo');
    expect(body).not.toContain('{gap}');
    expect(body).toContain('href="/new/TestPublicId"');
  });

  it('should keep a page without reviewed arguments out of search engines and of the sitemap', async () => {
    // Arrange
    const { arguments: reviewed, ...unargued } = trolley({ indexable: false });
    const catalog = { dilemmas: [unargued], withdrawn: [] };
    expect(reviewed).toBeDefined();

    // Act
    const page = await answer('/es/vida-y-muerte/el-tranvia-7', catalog);
    const sitemap = await answer('/sitemap.xml', catalog);

    // Assert
    expect(page.headers['X-Robots-Tag']).toBe('noindex');
    expect(page.body).toContain('<meta name="robots" content="noindex" />');
    expect(page.body).not.toContain('TestFor1');
    expect(sitemap.body).not.toContain('el-tranvia-7');
  });

  it('should let search engines index a page with reviewed arguments, and list it in the sitemap', async () => {
    // Arrange
    const catalog = { dilemmas: [trolley()], withdrawn: [] };

    // Act
    const page = await answer('/es/vida-y-muerte/el-tranvia-7', catalog);
    const sitemap = await answer('/sitemap.xml', catalog);

    // Assert
    expect(page.headers['X-Robots-Tag']).toBeUndefined();
    expect(page.body).not.toContain('name="robots"');
    expect(sitemap.body).toContain(
      '<loc>https://thelever.test/es/vida-y-muerte/el-tranvia-7</loc>',
    );
  });

  it('should keep every page out of search engines in dev', async () => {
    // Act
    const page = await answer(
      '/es/vida-y-muerte/el-tranvia-7',
      { dilemmas: [trolley()], withdrawn: [] },
      'dev',
    );
    const robots = await answer('/robots.txt', { dilemmas: [], withdrawn: [] }, 'dev');

    // Assert
    expect(page.headers['X-Robots-Tag']).toBe('noindex');
    expect(robots.body).toContain('Disallow: /');
  });

  it('should send the old address of a dilemma whose name changed to the new one', async () => {
    // Act
    const page = await answer('/es/vida-y-muerte/un-nombre-viejo-7', {
      dilemmas: [trolley()],
      withdrawn: [],
    });

    // Assert
    expect(page.status).toBe(301);
    expect(page.headers.Location).toBe('/es/vida-y-muerte/el-tranvia-7');
  });

  it('should answer that a withdrawn dilemma no longer exists, offering its category', async () => {
    // Act
    const page = await answer('/es/vida-y-muerte/el-tranvia-7', {
      dilemmas: [],
      withdrawn: [{ number: 7, category: 'life-and-death' }],
    });

    // Assert
    expect(page.status).toBe(410);
    expect(page.headers['X-Robots-Tag']).toBe('noindex');
    expect(page.body).toContain('Este dilema ya no está en TheLever');
    expect(page.body).toContain('href="/es/vida-y-muerte/"');
  });

  it('should answer 404 to an address that is not a page', async () => {
    // Act
    const page = await answer('/es/nada', { dilemmas: [], withdrawn: [] });

    // Assert
    expect(page.status).toBe(404);
    expect(page.body).toContain('Esta página no existe');
  });

  it('should list the dilemmas of a category in its page, and have the home link to every category', async () => {
    // Arrange
    const catalog = { dilemmas: [trolley()], withdrawn: [] };

    // Act
    const category = await answer('/es/vida-y-muerte/', catalog);
    const home = await answer('/es/', catalog);

    // Assert
    expect(category.body).toContain('href="/es/vida-y-muerte/el-tranvia-7"');
    expect(home.body).toContain('href="/es/tecnologia-y-futuro/"');
    expect(home.body).toContain('href="/es/privacidad"');
    expect(home.body).toContain('href="/es/aviso-legal"');
  });

  it('should declare the publisher of AdSense in ads.txt once there is one, and answer 404 until then', async () => {
    // Arrange
    const site = published({ dilemmas: [], withdrawn: [] });

    // Act
    const declared = await respond('/ads.txt', site, {
      environment: 'prod',
      origin: CONFIG.origin,
      adsenseClient: 'ca-pub-1234567890',
    });
    const none = await respond('/ads.txt', site, { environment: 'prod', origin: CONFIG.origin });

    // Assert
    expect(declared.body).toBe('google.com, pub-1234567890, DIRECT, f08c47fec0942fa0\n');
    expect(none.status).toBe(404);
  });

  it('should send an address without its slash at the end to the one with it, and the other way round', async () => {
    // Arrange
    const catalog = { dilemmas: [trolley()], withdrawn: [] };

    // Act
    const category = await answer('/es/vida-y-muerte', catalog);
    const privacy = await answer('/es/privacidad/', catalog);

    // Assert
    expect(category.headers.Location).toBe('/es/vida-y-muerte/');
    expect(privacy.headers.Location).toBe('/es/privacidad');
  });

  it('should keep in the CDN only the pages, never an address that moved, is gone or does not exist', async () => {
    // Arrange
    const catalog = {
      dilemmas: [trolley()],
      withdrawn: [{ number: 8, category: 'honesty' as const }],
    };

    // Act
    const page = await answer('/es/vida-y-muerte/el-tranvia-7', catalog);
    const moved = await answer('/es/vida-y-muerte/viejo-7', catalog);
    const gone = await answer('/es/honestidad/otro-8', catalog);
    const missing = await answer('/es/nada', catalog);

    // Assert
    expect(page.headers['Cache-Control']).toContain('s-maxage');
    for (const other of [moved, gone, missing]) {
      expect(other.headers['Cache-Control']).toBe('public, max-age=60');
    }
  });
});
