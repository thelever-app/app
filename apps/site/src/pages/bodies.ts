import type { Category, PublicDilemma } from '@thelever-app/dilemmas';
import { GAP_MARKER } from '@thelever-app/dilemmas/published';
import { categoryPath, homePath } from '../addresses.ts';
import { type Html, html } from '../html.ts';
import type { OwnPage, SiteTexts } from '../texts/site-texts.ts';
import { icon } from './icons.ts';
import type { Owner } from './page.ts';

/** A dilemma as its page and the page of its category show it. */
export interface ShownDilemma {
  readonly dilemma: PublicDilemma;
  readonly path: string;
}

/** The text of a dilemma on the web, with the gap "someone in the group" said in words. */
export function readable(text: string, texts: SiteTexts): string {
  return text.replaceAll(GAP_MARKER, texts.someoneInYourGroup);
}

export function homeBody(language: string, texts: SiteTexts, appBase: string): Html {
  return html`<div class="home">
    <div class="hero">
      <div class="hero-text">
        <h1>${texts.home.heading}</h1>
        <p class="intro">${texts.home.intro}</p>
        <a class="button primary play" href="${appBase}/app"
          >${icon('add-circle')}${texts.home.play}</a
        >
      </div>
      <img
        class="hero-scene"
        src="/_site/waving-at-junction.svg"
        alt="${texts.home.scene}"
        width="480"
        height="227"
      />
    </div>
    <section class="home-section">
      <h2>${texts.home.howToPlay}</h2>
      <ol class="steps">
        ${texts.home.steps.map((step) => html`<li>${step}</li>`)}
      </ol>
    </section>
    <section class="home-section">
      <h2>${texts.home.categories}</h2>
      <ul class="chips">
        ${Object.entries(texts.categories).map(
          ([, { name }]) =>
            html`<li><a class="chip" href="${categoryPath(language, name)}">${name}</a></li>`,
        )}
      </ul>
    </section>
  </div>`;
}

export function categoryBody(
  language: string,
  category: Category,
  dilemmas: readonly ShownDilemma[],
  texts: SiteTexts,
): Html {
  const { name, description } = texts.categories[category];
  return html`<nav class="crumbs" aria-label="breadcrumb">
      <a href="${homePath(language)}">${texts.homeLink}</a> › ${name}
    </nav>
    <h1>${texts.category.heading(name)}</h1>
    <p class="intro">${description}</p>
    <ul class="dilemmas">
      ${dilemmas.map(
        ({ dilemma, path }) =>
          html`<li>
            <a class="card" href="${path}"
              ><span class="card-title">${readable(dilemma.name, texts)}</span
              ><span class="card-meta"
                >${texts.category.options(dilemma.options.length)} ·
                ${texts.category.withArguments}</span
              ></a
            >
          </li>`,
      )}
    </ul>`;
}

export function dilemmaBody({ dilemma }: ShownDilemma, texts: SiteTexts, appBase: string): Html {
  const { name } = texts.categories[dilemma.category];
  const args = dilemma.arguments;
  const argued = (optionId: string) => args.options.find((option) => option.optionId === optionId);
  return html`<nav class="crumbs" aria-label="breadcrumb">
      <a href="${homePath(dilemma.language)}">${texts.homeLink}</a> ›
      <a href="${categoryPath(dilemma.language, name)}">${name}</a>
    </nav>
    <div class="dilemma">
      <section class="dilemma-main">
        <h1>${readable(dilemma.name, texts)}</h1>
        <p class="dilemma-text">${readable(dilemma.text, texts)}</p>
        <ul class="options">
          ${dilemma.options.map((option) => html`<li>${readable(option.text, texts)}</li>`)}
        </ul>
        <div class="actions">
          <a class="button" href="${appBase}/new/${dilemma.publicId}">${texts.dilemma.play}</a>
        </div>
      </section>
      ${html`<section class="dilemma-arguments">
        <h2>${texts.dilemma.arguments}</h2>
        ${dilemma.options.map((option) => {
          const argument = argued(option.optionId);
          return html`<article class="argument">
            <h3>${readable(option.text, texts)}</h3>
            <p><strong>${texts.dilemma.for}</strong> ${readable(argument?.for ?? '', texts)}</p>
            <p>
              <strong>${texts.dilemma.against}</strong>
              ${readable(argument?.against ?? '', texts)}
            </p>
          </article>`;
        })}
        <p class="credit">
          ${texts.dilemma.byTheTeam}${args.context ? html` ${readable(args.context, texts)}` : ''}
        </p>
      </section>`}
    </div>
    <a class="more" href="${categoryPath(dilemma.language, name)}"
      >${texts.dilemma.moreOf(name)}</a
    >`;
}

export function goneBody(language: string, category: Category, texts: SiteTexts): Html {
  const { name } = texts.categories[category];
  return html`<img class="scene" src="/_site/doubting-at-track-end.svg" alt="" />
    <h1>${texts.gone.heading}</h1>
    <p class="intro">${texts.gone.body}</p>
    <a class="button primary" href="${categoryPath(language, name)}">${texts.gone.moreOf(name)}</a>
    <a class="button" href="${homePath(language)}">${texts.homeLink}</a>`;
}

export function notFoundBody(language: string, texts: SiteTexts): Html {
  return html`<img class="scene" src="/_site/doubting-at-track-end.svg" alt="" />
    <h1>${texts.notFound.heading}</h1>
    <p class="intro">${texts.notFound.body}</p>
    <a class="button primary" href="${homePath(language)}">${texts.homeLink}</a>`;
}

/** A text of a page of its own with who is behind TheLever in place of its marks. */
function withOwner(text: string, owner: Owner): string {
  return text
    .replaceAll('{owner}', owner.name)
    .replaceAll('{taxId}', owner.taxId)
    .replaceAll('{address}', owner.address);
}

/** A page of its own: its sections, with the paragraphs that start with "- " as a list. */
export function ownPageBody(page: OwnPage, owner: Owner): Html {
  return html`<article class="own-page">
    <h1>${page.title}</h1>
    ${page.sections.map(({ heading, paragraphs }) => {
      const items = paragraphs.filter((paragraph) => paragraph.startsWith('- '));
      const rest = paragraphs.filter((paragraph) => !paragraph.startsWith('- '));
      return html`<h2>${heading}</h2>
        ${rest.map((paragraph) => html`<p>${withOwner(paragraph, owner)}</p>`)}
        ${
          items.length > 0
            ? html`<ul>
                ${items.map((item) => html`<li>${withOwner(item.slice(2), owner)}</li>`)}
              </ul>`
            : ''
        }`;
    })}
    <p class="updated">${page.updated}</p>
  </article>`;
}
