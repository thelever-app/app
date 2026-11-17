import type { PublicDilemma } from '@thelever-app/dilemmas';
import { pagePath } from '../addresses.ts';
import { type Html, html } from '../html.ts';
import type { SiteTexts } from '../texts/site-texts.ts';
import { assetPath } from '../serve/assets.ts';
import { icon } from './icons.ts';

/** Where the site is and what it links to, by environment. */
export interface SiteConfig {
  /** The origin of the public web, for canonical addresses and the sitemap: https://thelever.app. */
  readonly origin: string;
  /** Where the app is, before its paths; empty when it is on the same origin as the web. */
  readonly appBase: string;
  /** Who is behind TheLever, as the legal notice and the privacy policy name them. */
  readonly owner: Owner;
  /** The publisher id of AdSense, whose meta tag lets Google verify the site; none until there is an account. */
  readonly adsenseClient?: string;
}

/** Who is behind TheLever: given by the environment, never written in the repository. */
export interface Owner {
  readonly name: string;
  readonly taxId: string;
  readonly address: string;
}

/** A page of the public web in one language, before it is written out. */
export interface Page {
  readonly path: string;
  readonly language: string;
  readonly title: string;
  readonly description: string;
  /** The same page in each language it exists in, this one included. */
  readonly alternates: Readonly<Record<string, string>>;
  /** Whether search engines may index it. */
  readonly indexable: boolean;
  /** Whether it is the home, which draws its own logo and is what x-default points to. */
  readonly home?: boolean;
  readonly main: Html;
  /** The dilemma it shows, if it is the page of one. */
  readonly dilemma?: PublicDilemma;
}

/** The languages of the web, each with its texts, in the order the menu shows them. */
export type Languages = ReadonlyMap<string, SiteTexts>;

/**
 * The whole document of a page: its head, the header with the logo, the languages and the way into
 * the app, and the footer.
 */
export function document(page: Page, languages: Languages, config: SiteConfig): Html {
  const texts = languages.get(page.language)!;
  const home = page.home === true;
  return html`<!doctype html>
    <html lang="${page.language}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${page.title}</title>
        <meta name="description" content="${page.description}" />
        ${page.indexable ? '' : html`<meta name="robots" content="noindex" />`}
        <link rel="canonical" href="${config.origin}${page.path}" />
        ${Object.entries(page.alternates).map(
          ([language, path]) =>
            html`<link rel="alternate" hreflang="${language}" href="${config.origin}${path}" />`,
        )}
        ${home ? html`<link rel="alternate" hreflang="x-default" href="${config.origin}/" />` : ''}
        ${config.adsenseClient ? html`<meta name="google-adsense-account" content="${config.adsenseClient}" />` : ''}
        <link rel="icon" href="${assetPath('mascot-waving.svg')}" type="image/svg+xml" />
        <link rel="stylesheet" href="${assetPath('site.css')}" />
      </head>
      <body>
        <header class="header${home ? ' at-home' : ''}">
          <a class="logo" href="/${page.language}/"
            ><img
              src="${assetPath('mascot-waving.svg')}"
              alt=""
              width="32"
              height="32"
            />TheLever.app</a
          >
          ${languageMenu(page, languages)}
          <a class="button primary header-play" href="${config.appBase}/app">${texts.home.play}</a>
        </header>
        <div class="stripe" aria-hidden="true"></div>
        <main class="main">${page.main}</main>
        <footer class="footer" aria-label="${texts.footer.label}">
          <a href="${pagePath(page.language, texts.privacy.title)}">${texts.privacy.title}</a>
          <a href="${pagePath(page.language, texts.legalNotice.title)}"
            >${texts.legalNotice.title}</a
          >
        </footer>
      </body>
    </html> `;
}

/** The menu of languages: each one takes to this same page in it, if it exists there. */
function languageMenu(page: Page, languages: Languages): Html {
  const texts = languages.get(page.language)!;
  return html`<details class="languages">
    <summary aria-label="${texts.languageMenu}">
      ${icon('translate')}<span aria-hidden="true">${page.language.toUpperCase()}</span>
    </summary>
    <div class="languages-sheet">
      <h2 class="languages-title">${texts.languageMenu}</h2>
      <ul>
        ${[...languages].map(([language, other]) => {
          const path = page.alternates[language] ?? `/${language}/`;
          return html`<li>
            <a
              href="${path}"
              hreflang="${language}"
              lang="${language}"
              ${language === page.language ? html` aria-current="page"` : ''}
              >${other.languageName}</a
            >
          </li>`;
        })}
      </ul>
    </div>
  </details>`;
}
