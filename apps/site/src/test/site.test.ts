import type { GetPublicCatalogOutput, PublicDilemma } from '@thelever-app/dilemmas';
import { describe, expect, it } from 'vitest';
import { pagePath } from '../addresses.ts';
import { buildSite, fileOf } from '../build-site.ts';
import type { Languages } from '../pages/page.ts';
import { type Environment, respond } from '../respond.ts';
import { es } from '../texts/es.ts';
import { assetPath } from '../serve/assets.ts';
import { LANGUAGES as SITE_LANGUAGES } from '../texts/index.ts';

const CONFIG = {
  origin: 'https://thelever.test',
  appBase: '',
  owner: { name: 'TestOwner', taxId: 'TestTaxId', address: 'TestAddress' },
};
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
  return respond(path, published(catalog), {
    environment,
    origin: CONFIG.origin,
    languages: [...LANGUAGES.keys()],
  });
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

  it('should keep the privacy policy and the legal notice out of search engines and of the sitemap', async () => {
    // Arrange
    const catalog = { dilemmas: [trolley()], withdrawn: [] };

    // Act
    const privacy = await answer('/es/privacidad', catalog);
    const notice = await answer('/es/aviso-legal', catalog);
    const sitemap = await answer('/sitemap.xml', catalog);

    // Assert
    for (const page of [privacy, notice]) {
      expect(page.status).toBe(200);
      expect(page.headers['X-Robots-Tag']).toBe('noindex');
    }
    expect(sitemap.body).not.toContain('/es/privacidad');
    expect(sitemap.body).not.toContain('/es/aviso-legal');
  });

  it('should name the one responsible in the privacy policy without the tax id or the address', async () => {
    // Act
    const { body } = await answer('/es/privacidad', { dilemmas: [], withdrawn: [] });

    // Assert
    expect(body).toContain('TestOwner');
    expect(body).toContain('privacidad@thelever.app');
    expect(body).not.toContain('TestTaxId');
    expect(body).not.toContain('TestAddress');
  });

  it('should give in the legal notice who is behind TheLever, as the environment gives it', async () => {
    // Act
    const { body } = await answer('/es/aviso-legal', { dilemmas: [], withdrawn: [] });

    // Assert
    expect(body).toContain('TestOwner');
    expect(body).toContain('TestTaxId');
    expect(body).toContain('TestAddress');
    expect(body).not.toContain('{');
  });

  it('should fill in who is behind TheLever in the privacy policy and the legal notice of every language', () => {
    // Act
    const { files } = buildSite({ dilemmas: [], withdrawn: [] }, SITE_LANGUAGES, CONFIG);

    // Assert
    for (const [language, texts] of SITE_LANGUAGES) {
      const privacy = files.get(fileOf(pagePath(language, texts.privacy.title)))!.body;
      const notice = files.get(fileOf(pagePath(language, texts.legalNotice.title)))!.body;
      expect(privacy, language).toContain('TestOwner');
      expect(notice, language).toContain('TestTaxId');
      expect(notice, language).toContain('TestAddress');
      expect(`${privacy}${notice}`, language).not.toMatch(/\{(owner|taxId|address)\}/);
    }
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
      languages: ['es'],
      adsenseClient: 'ca-pub-1234567890',
    });
    const none = await respond('/ads.txt', site, {
      environment: 'prod',
      origin: CONFIG.origin,
      languages: ['es'],
    });

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

  it('should send the root to the home in the language of the browser, and never keep it in the CDN', async () => {
    // Arrange
    const site = published({ dilemmas: [], withdrawn: [] });
    const options = {
      environment: 'prod' as const,
      origin: CONFIG.origin,
      languages: ['es', 'en'],
    };

    // Act
    const english = await respond('/', site, options, 'de-DE,de;q=0.9,en;q=0.8');
    const other = await respond('/', site, options, 'ja');
    const none = await respond('/', site, options);

    // Assert
    expect(english.status).toBe(302);
    expect(english.headers.Location).toBe('/en/');
    expect(english.headers['Cache-Control']).toBe('private, no-store');
    expect(other.headers.Location).toBe('/es/');
    expect(none.headers.Location).toBe('/es/');
  });

  it('should take the home to the start of the app to create a room', async () => {
    // Act
    const home = await answer('/es/', { dilemmas: [], withdrawn: [] });

    // Assert
    expect(home.body).toContain('href="/app"');
    expect(home.body).toContain('hreflang="x-default" href="https://thelever.test/"');
  });

  it('should open the home with La Palanca at the junction, the way into the app and the steps', async () => {
    // Act
    const home = String((await answer('/es/', { dilemmas: [], withdrawn: [] })).body);

    // Assert
    expect(home).toMatch(
      new RegExp(`src="/_site/waving-at-junction.svg\\?v=[0-9a-f]+"\\s+alt="${es.home.scene}"`),
    );
    expect(home).toMatch(
      /<a class="button primary play" href="\/app"\s*><svg[^>]*aria-hidden="true"/,
    );
    expect(home).toContain('<ol class="steps" role="list">');
  });

  it('should leave the logo of the home and its x-default to the home, not to the page of an address that does not exist', async () => {
    // Act
    const home = String((await answer('/es/', { dilemmas: [], withdrawn: [] })).body);
    const missing = String((await answer('/es/nada', { dilemmas: [], withdrawn: [] })).body);

    // Assert
    expect(home).toContain('class="header at-home"');
    expect(home).toContain('hreflang="x-default"');
    expect(missing).toContain('class="header"');
    expect(missing).not.toContain('hreflang="x-default"');
  });

  it('should give the stylesheet and the illustrations an address that changes with their content', async () => {
    // Act
    const home = String((await answer('/es/', { dilemmas: [], withdrawn: [] })).body);

    // Assert: a browser that kept an earlier stylesheet asks for this one, at its new address.
    expect(home).toContain(`href="${assetPath('site.css')}"`);
    expect(home).toContain(`src="${assetPath('mascot-waving.svg')}"`);
    expect(home).toContain(`src="${assetPath('waving-at-junction.svg')}"`);
    expect(assetPath('site.css')).toMatch(/^\/_site\/site\.css\?v=[0-9a-f]{12}$/);
  });

  it('should offer to play from the header of every page, next to the languages', async () => {
    // Act
    const page = String(
      (await answer('/es/vida-y-muerte/el-tranvia-7', { dilemmas: [trolley()], withdrawn: [] }))
        .body,
    );

    // Assert
    const header = page.slice(page.indexOf('<header'), page.indexOf('</header>'));
    expect(header).toContain(
      `<a class="button primary header-play" href="/app">${es.home.play}</a>`,
    );
    expect(header).toMatch(/<summary[^>]*>\s*<svg[^>]*aria-hidden="true"/);
  });
});
