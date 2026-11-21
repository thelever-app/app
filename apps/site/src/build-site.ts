import { CATEGORIES, type Category, type GetPublicCatalogOutput } from '@thelever-app/dilemmas';
import { categoryPath, dilemmaPath, homePath, pagePath } from './addresses.ts';
import { html } from './html.ts';
import {
  categoryBody,
  dilemmaBody,
  goneBody,
  homeBody,
  notFoundBody,
  ownPageBody,
  readable,
  type ShownDilemma,
} from './pages/bodies.ts';
import { adsOf, document, type Languages, type Page, type SiteConfig } from './pages/page.ts';

export interface SiteFile {
  readonly body: string;
  readonly contentType: string;
}

/** What the service needs to answer any address without looking at every file. */
export interface SiteManifest {
  /** Each page by its address, with the file it is in and whether search engines may index it. */
  readonly pages: Readonly<Record<string, { readonly file: string; readonly indexable: boolean }>>;
  /** The address of each dilemma by language and number, to send an old address to the new one. */
  readonly dilemmas: Readonly<Record<string, Readonly<Record<number, string>>>>;
  /** The category each dilemma withdrawn from the catalog had, by its number. */
  readonly withdrawn: Readonly<Record<number, Category>>;
}

export interface BuiltSite {
  readonly files: ReadonlyMap<string, SiteFile>;
  readonly manifest: SiteManifest;
  /** Every page, as it was before it was written out. */
  readonly pages: readonly Page[];
}

const HTML = 'text/html; charset=utf-8';

/** The file of the page at that address. */
export function fileOf(path: string): string {
  return `pages${path.endsWith('/') ? `${path}index` : path}.html`;
}

export function goneFileOf(language: string, category: Category): string {
  return `gone/${language}/${category}.html`;
}

export function notFoundFileOf(language: string): string {
  return `not-found/${language}.html`;
}

export const SITEMAP_FILE = 'sitemap.xml';

/**
 * The whole public web from the public catalog: in each language, the home, a page for each
 * category and one for each dilemma, the privacy policy and the legal notice; the pages that
 * answer a withdrawn dilemma and an address that does not exist; and the sitemap, with only what
 * search engines may index.
 */
export function buildSite(
  catalog: GetPublicCatalogOutput,
  languages: Languages,
  config: SiteConfig,
): BuiltSite {
  const codes = [...languages.keys()];
  const shown = catalog.dilemmas
    .filter(({ language }) => languages.has(language))
    .map((dilemma): ShownDilemma => {
      const texts = languages.get(dilemma.language)!;
      const category = texts.categories[dilemma.category].name;
      const name = readable(dilemma.name, texts);
      return { dilemma, path: dilemmaPath(dilemma.language, category, name, dilemma.number) };
    });
  const everywhere = (pathIn: (language: string) => string) =>
    Object.fromEntries(codes.map((language) => [language, pathIn(language)]));

  const pages: Page[] = [];
  for (const [language, texts] of languages) {
    pages.push({
      path: homePath(language),
      language,
      title: texts.home.title,
      description: texts.home.description,
      alternates: everywhere(homePath),
      indexable: true,
      home: true,
      main: homeBody(language, texts, config.appBase, config.donationUrl),
    });
    for (const category of CATEGORIES) {
      const { name } = texts.categories[category];
      pages.push({
        path: categoryPath(language, name),
        language,
        title: `${texts.category.heading(name)} | TheLever`,
        description: texts.category.description(name),
        alternates: everywhere((other) =>
          categoryPath(other, languages.get(other)!.categories[category].name),
        ),
        indexable: true,
        main: categoryBody(
          language,
          category,
          shown.filter(
            ({ dilemma }) => dilemma.language === language && dilemma.category === category,
          ),
          texts,
        ),
      });
    }
    for (const which of ['privacy', 'cookies', 'legalNotice', 'terms', 'appPrivacy'] as const) {
      const own = texts[which];
      pages.push({
        path: pagePath(language, own.title),
        language,
        title: `${own.title} | TheLever`,
        description: own.description,
        alternates: everywhere((other) => pagePath(other, languages.get(other)![which].title)),
        // Kept out of search engines: they name who is behind TheLever, and the law asks
        // only that they be at hand, which the footer of every page does.
        indexable: false,
        main: ownPageBody(own, config.owner),
      });
    }
  }
  for (const one of shown) {
    const { dilemma } = one;
    const texts = languages.get(dilemma.language)!;
    const versions = shown.filter(({ dilemma: other }) => other.number === dilemma.number);
    pages.push({
      path: one.path,
      language: dilemma.language,
      title: `${readable(dilemma.name, texts)} | TheLever`,
      description: readable(dilemma.text, texts),
      alternates: Object.fromEntries(
        versions.map(({ dilemma: other, path }) => [other.language, path]),
      ),
      indexable: true,
      main: dilemmaBody(one, texts, config.appBase, config.donationUrl, adsOf(config)),
      dilemma,
    });
  }

  const files = new Map<string, SiteFile>();
  for (const page of pages) {
    files.set(fileOf(page.path), {
      body: document(page, languages, config).value,
      contentType: HTML,
    });
  }
  for (const [language, texts] of languages) {
    for (const category of CATEGORIES) {
      files.set(goneFileOf(language, category), {
        body: document(
          {
            path: homePath(language),
            language,
            title: texts.gone.title,
            description: texts.gone.body,
            alternates: {},
            indexable: false,
            main: goneBody(language, category, texts),
          },
          languages,
          config,
        ).value,
        contentType: HTML,
      });
    }
    files.set(notFoundFileOf(language), {
      body: document(
        {
          path: homePath(language),
          language,
          title: texts.notFound.title,
          description: texts.notFound.body,
          alternates: {},
          indexable: false,
          main: notFoundBody(language, texts),
        },
        languages,
        config,
      ).value,
      contentType: HTML,
    });
  }
  files.set(SITEMAP_FILE, {
    body: sitemap(
      pages.filter(({ indexable }) => indexable),
      config.origin,
    ),
    contentType: 'application/xml; charset=utf-8',
  });

  return {
    files,
    pages,
    manifest: {
      pages: Object.fromEntries(
        pages.map(({ path, indexable }) => [path, { file: fileOf(path), indexable }]),
      ),
      dilemmas: Object.fromEntries(
        codes.map((language) => [
          language,
          Object.fromEntries(
            shown
              .filter(({ dilemma }) => dilemma.language === language)
              .map(({ dilemma, path }) => [dilemma.number, path]),
          ),
        ]),
      ),
      withdrawn: Object.fromEntries(
        catalog.withdrawn.map(({ number, category }) => [number, category]),
      ),
    },
  };
}

function sitemap(pages: readonly Page[], origin: string): string {
  return html`<?xml version="1.0" encoding="UTF-8"?>
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xhtml="http://www.w3.org/1999/xhtml"
    >
      ${pages.map(
        (page) =>
          html`<url
            ><loc>${origin}${page.path}</loc>${Object.entries(page.alternates).map(
              ([language, path]) =>
                html`<xhtml:link rel="alternate" hreflang="${language}" href="${origin}${path}" />`,
            )}</url
          >`,
      )}
    </urlset> `.value;
}
