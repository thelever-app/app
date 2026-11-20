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

/** What the environment configures for the ads of the web, once AdSense has its ad units. */
const ADS = {
  adsenseClient: 'ca-pub-0000000000000001',
  adSlots: { phone: '1111111111', top: '2222222222', side: '3333333333' },
};

async function answerWithAds(path: string, catalog: GetPublicCatalogOutput, ads: object = ADS) {
  const { files, manifest } = buildSite(catalog, LANGUAGES, { ...CONFIG, ...ads });
  return respond(
    path,
    { manifest, read: async (file: string) => files.get(file)?.body },
    { environment: 'prod', origin: CONFIG.origin, languages: [...LANGUAGES.keys()] },
  );
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
    expect(body).toContain('href="/new/TestPublicId?lang=es"');
  });

  it('should keep the privacy policy, the cookie policy and the legal notice out of search engines and of the sitemap', async () => {
    // Arrange
    const catalog = { dilemmas: [trolley()], withdrawn: [] };

    // Act
    const privacy = await answer('/es/privacidad', catalog);
    const cookies = await answer('/es/cookies', catalog);
    const notice = await answer('/es/aviso-legal', catalog);
    const sitemap = await answer('/sitemap.xml', catalog);

    // Assert
    for (const page of [privacy, cookies, notice]) {
      expect(page.status).toBe(200);
      expect(page.headers['X-Robots-Tag']).toBe('noindex');
    }
    expect(sitemap.body).not.toContain('/es/privacidad');
    expect(sitemap.body).not.toContain('/es/cookies');
    expect(sitemap.body).not.toContain('/es/aviso-legal');
  });

  it('should keep the paragraphs and the lists of a page of its own in the order it has them', async () => {
    // Act
    const page = String((await answer('/es/cookies', { dilemmas: [], withdrawn: [] })).body);

    // Assert
    const at = (text: string) => page.indexOf(text);
    expect(at('Todas las demás')).toBeLessThan(at('<li>Para mostrar y medir'));
    expect(at('<li>Para personalizar')).toBeLessThan(at('Google también puede guardar'));
  });

  it('should list in the cookie policy of every language the cookies Google sets, with what they are for and how long they last', () => {
    // Act
    const { files } = buildSite({ dilemmas: [], withdrawn: [] }, SITE_LANGUAGES, CONFIG);

    // Assert
    for (const [language, texts] of SITE_LANGUAGES) {
      const page = files.get(fileOf(pagePath(language, texts.cookies.title)))?.body;
      expect(page, language).toBeDefined();
      for (const name of ['FCCDCF', 'FCNEC', '__gads', '__gpi', '__eoi', 'IDE', 'DSID']) {
        expect(page, `${language}: ${name}`).toContain(`<td>${name}</td>`);
      }
    }
  });

  it('should show on a dilemma page the ads of the environment: below the arguments on a phone, above and beside them on a wide screen', async () => {
    // Act
    const page = String(
      (
        await answerWithAds('/es/vida-y-muerte/el-tranvia-7', {
          dilemmas: [trolley()],
          withdrawn: [],
        })
      ).body,
    );

    // Assert
    expect(page).toMatch(
      /<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-0000000000000001"\s+crossorigin="anonymous"\s*><\/script>/,
    );
    for (const [where, slot] of [
      ['phone', '1111111111'],
      ['top', '2222222222'],
      ['side', '3333333333'],
    ]) {
      expect(page).toMatch(
        new RegExp(
          `<aside class="ad ad-${where}" aria-label="${es.dilemma.ad}">[\\s\\S]*?data-ad-client="ca-pub-0000000000000001"[\\s\\S]*?data-ad-slot="${slot}"`,
        ),
      );
    }
    const at = (text: string) => page.indexOf(text);
    expect(at('ad ad-top')).toBeLessThan(at('class="crumbs"'));
    expect(at('class="dilemma-arguments"')).toBeLessThan(at('ad ad-side'));
    expect(at('class="credit"')).toBeLessThan(at('ad ad-phone'));
    expect(at('ad ad-phone')).toBeLessThan(at('class="more"'));
  });

  it('should ask for ads that are not personalised when the browser sends Global Privacy Control', async () => {
    // Act
    const page = String(
      (
        await answerWithAds('/es/vida-y-muerte/el-tranvia-7', {
          dilemmas: [trolley()],
          withdrawn: [],
        })
      ).body,
    );

    // Assert: before the script of Google, which reads it when it loads.
    expect(page).toMatch(
      /navigator\.globalPrivacyControl[\s\S]*requestNonPersonalizedAds = 1[\s\S]*adsbygoogle\.js/,
    );
  });

  it('should show no ad on the home, the categories or the pages of their own', async () => {
    // Arrange
    const catalog = { dilemmas: [trolley()], withdrawn: [] };

    // Act
    const pages = await Promise.all(
      ['/es/', '/es/vida-y-muerte/', '/es/privacidad', '/es/cookies'].map(
        async (path) => (await answerWithAds(path, catalog)).body,
      ),
    );

    // Assert
    for (const page of pages) expect(page).not.toContain('adsbygoogle');
  });

  it('should show no ad while the environment has no ad units, though it declares its publisher', async () => {
    // Act
    const page = String(
      (
        await answerWithAds(
          '/es/vida-y-muerte/el-tranvia-7',
          { dilemmas: [trolley()], withdrawn: [] },
          { adsenseClient: ADS.adsenseClient },
        )
      ).body,
    );

    // Assert
    expect(page).toContain('<meta name="google-adsense-account"');
    expect(page).not.toContain('adsbygoogle');
    expect(page).not.toContain('data-consent');
  });

  it('should link the cookie policy from every page, and let whoever reads a dilemma with ads change what they accepted', async () => {
    // Arrange
    const catalog = { dilemmas: [trolley()], withdrawn: [] };

    // Act
    const home = String((await answerWithAds('/es/', catalog)).body);
    const dilemma = String((await answerWithAds('/es/vida-y-muerte/el-tranvia-7', catalog)).body);

    // Assert
    for (const page of [home, dilemma]) {
      expect(page).toContain(`<a href="/es/cookies">${es.cookies.title}</a>`);
    }
    expect(dilemma).toMatch(
      new RegExp(`<button type="button" class="link" data-consent>\\s*${es.footer.manageCookies}`),
    );
    expect(home).not.toContain('data-consent');
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

  it('should offer to vote the dilemma alone in the app, in the language of the page and with the way back to it', async () => {
    // Act
    const page = String(
      (await answer('/es/vida-y-muerte/el-tranvia-7', { dilemmas: [trolley()], withdrawn: [] }))
        .body,
    );

    // Assert
    expect(page).toMatch(
      new RegExp(
        `<a\\s+class="button primary"\\s+href="/vote/TestPublicId\\?lang=es&back=%2Fes%2Fvida-y-muerte%2Fel-tranvia-7"\\s*>[\\s\\S]*?${es.dilemma.vote}`,
      ),
    );
    expect(page).toContain(es.dilemma.worldResultLater);
    expect(page.indexOf(es.dilemma.vote)).toBeLessThan(page.indexOf(es.dilemma.play));
  });

  it('should open the app in the language of the page, from the dilemma, the home and the header', async () => {
    // Act
    const catalog = { dilemmas: [trolley(), IN_ENGLISH], withdrawn: [] };
    const dilemma = String((await answer('/en/life-and-death/the-trolley-7', catalog)).body);
    const home = String((await answer('/en/', catalog)).body);

    // Assert
    expect(dilemma).toContain('href="/new/TestEnglishPublicId?lang=en"');
    expect(dilemma).toContain('class="button primary header-play" href="/app?lang=en"');
    expect(home).toMatch(/class="button primary play" href="\/app\?lang=en"/);
  });

  it('should take the home to the start of the app to create a room', async () => {
    // Act
    const home = await answer('/es/', { dilemmas: [], withdrawn: [] });

    // Assert
    expect(home.body).toContain('href="/app?lang=es"');
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
      /<a class="button primary play" href="\/app\?lang=es"\s*><svg[^>]*aria-hidden="true"/,
    );
    expect(home).toContain('<ol class="steps" role="list">');
  });

  it('should show each step of how to play with a screen of the app in miniature that only decorates', async () => {
    // Act
    const home = String((await answer('/es/', { dilemmas: [], withdrawn: [] })).body);

    // Assert
    for (const { title, text } of es.home.steps) {
      expect(home).toContain(`<h3>${title}</h3>`);
      expect(home).toContain(text);
    }
    expect(home.match(/<div class="step-screen" aria-hidden="true">/g)).toHaveLength(3);
    expect(home).toContain(es.home.screens.roomCode);
    expect(home).toMatch(/src="\/_site\/faces\/face-01\.svg\?v=[0-9a-f]+"/);
    expect(home).toMatch(/class="mini-code">[A-HJ-KM-NP-Z2-9]{5}</);
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

  it('should show the icon of the app in the tab', async () => {
    // Act
    const home = String((await answer('/es/', { dilemmas: [], withdrawn: [] })).body);

    // Assert
    expect(home).toContain(`<link rel="icon" href="${assetPath('icon.svg')}"`);
  });

  it('should offer to play from the header of every page, next to the languages', async () => {
    // Act
    const page = String(
      (await answer('/es/vida-y-muerte/el-tranvia-7', { dilemmas: [trolley()], withdrawn: [] }))
        .body,
    );

    // Assert
    const header = page.slice(page.indexOf('<header'), page.indexOf('</header>'));
    expect(header).toMatch(
      new RegExp(
        `<a class="button primary header-play" href="/app\\?lang=es"\\s*>${es.home.play}</a`,
      ),
    );
    expect(header).toMatch(/<summary[^>]*>\s*<svg[^>]*aria-hidden="true"/);
  });
});
