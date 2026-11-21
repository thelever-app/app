import type { Category, PublicDilemma } from '@thelever-app/dilemmas';
import { GAP_MARKER } from '@thelever-app/dilemmas/published';
import { categoryPath, homePath } from '../addresses.ts';
import { type Html, html } from '../html.ts';
import type { OwnPage, SiteTexts } from '../texts/site-texts.ts';
import { assetPath } from '../serve/assets.ts';
import { icon } from './icons.ts';
import type { AdSlots, Owner } from './page.ts';

/** A dilemma as its page and the page of its category show it. */
export interface ShownDilemma {
  readonly dilemma: PublicDilemma;
  readonly path: string;
}

/** The text of a dilemma on the web, with the gap "someone in the group" said in words. */
export function readable(text: string, texts: SiteTexts): string {
  return text.replaceAll(GAP_MARKER, texts.someoneInYourGroup);
}

export function homeBody(
  language: string,
  texts: SiteTexts,
  appBase: string,
  donationUrl: string,
): Html {
  return html`<div class="home">
    <div class="hero">
      <div class="hero-text">
        <h1>${texts.home.heading}</h1>
        <p class="intro">${texts.home.intro}</p>
        <a class="button primary play" href="${appBase}/app?lang=${language}"
          >${icon('add-circle')}${texts.home.play}</a
        >
      </div>
      <img
        class="hero-scene"
        src="${assetPath('waving-at-junction.svg')}"
        alt="${texts.home.scene}"
        width="480"
        height="227"
      />
    </div>
    <section class="home-section">
      <h2>${texts.home.howToPlay}</h2>
      ${howToPlay(texts)}
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
    <section class="support" aria-label="${texts.support.link}">
      <h2>${texts.support.heading}</h2>
      <p>${texts.support.text}</p>
      <a class="button" href="${donationUrl}">${icon('favorite')}${texts.support.link}</a>
    </section>
  </div>`;
}

/** Test data of the miniatures: who is in the room, by the face and the colour the app gives them. */
const FACES = [
  ['face-01', 'teal'],
  ['face-02', 'khaki'],
  ['face-03', 'rust'],
  ['face-04', 'olive'],
  ['face-05', 'cyan'],
] as const;

/** A code as the room gets one: five characters, without those that look alike. */
const ROOM_CODE = 'K7QFM';

function face(index: number): Html {
  const [name, color] = FACES[index]!;
  return html`<span class="mini-face mini-${color}"
    ><img src="${assetPath(`faces/${name}.svg`)}" alt="" width="34" height="34"
  /></span>`;
}

/** A step of how to play: a screen of the app in miniature, which only decorates, and what it says. */
function step(
  number: number,
  { title, text }: { readonly title: string; readonly text: string },
  screen: Html,
  dark = false,
): Html {
  return html`<li class="step">
    <div class="step-screen" aria-hidden="true">
      <div class="${dark ? 'mini mini-dark' : 'mini'}">${screen}</div>
    </div>
    <div class="step-text">
      <div class="step-head">
        <span class="step-number" aria-hidden="true">${number}</span>
        <h3>${title}</h3>
      </div>
      <p>${text}</p>
    </div>
  </li>`;
}

/** «Cómo se juega»: create the room, vote and predict, and find out who thinks what. */
function howToPlay(texts: SiteTexts): Html {
  const { steps, screens } = texts.home;
  const [create, vote, reveal] = steps as [
    (typeof steps)[number],
    (typeof steps)[number],
    (typeof steps)[number],
  ];
  return html`<ol class="steps" role="list">
    ${step(
      1,
      create,
      html`<span class="mini-label">${screens.roomCode}</span>
        <span class="mini-code">${ROOM_CODE}</span>
        <span class="mini-faces"
          >${[0, 1, 2].map(face)}<span class="mini-add">${icon('add')}</span></span
        >
        <span class="mini-share">${screens.share}</span>`,
    )}
    ${step(
      2,
      vote,
      html`<span class="mini-label">${screens.round}</span>
        <span class="mini-dilemma">${screens.dilemma}</span>
        <span class="mini-option mini-a">${screens.yes}</span>
        <span class="mini-option mini-b">${screens.no}</span>
        <span class="mini-private">${icon('lock')}${screens.private}</span>`,
    )}
    ${step(
      3,
      reveal,
      html`<span class="mini-label">${screens.result}</span>
        <span class="mini-result">
          <span class="mini-column mini-yes"
            ><span class="mini-faces">${[0, 1, 2].map(face)}</span
            ><span class="mini-bar mini-a">${screens.yesCount}</span></span
          >
          <span class="mini-column mini-no"
            ><span class="mini-faces">${[3, 4].map(face)}</span
            ><span class="mini-bar mini-b">${screens.noCount}</span></span
          >
        </span>
        <span class="mini-right">${screens.right}</span>`,
      true,
    )}
  </ol>`;
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

/** A space for an ad of AdSense, labelled as one: shown on phones or on wide screens only. */
function adUnit(where: keyof AdSlots, ads: Ads, texts: SiteTexts): Html {
  return html`<aside class="ad ad-${where}" aria-label="${texts.dilemma.ad}">
    <span class="ad-label" aria-hidden="true">${texts.dilemma.ad}</span>
    <ins
      class="adsbygoogle"
      data-ad-client="${ads.client}"
      data-ad-slot="${ads.slots[where]}"
    ></ins>
  </aside>`;
}

/** The publisher and the ad units the page shows ads with. */
export interface Ads {
  readonly client: string;
  readonly slots: AdSlots;
}

export function dilemmaBody(
  { dilemma, path }: ShownDilemma,
  texts: SiteTexts,
  appBase: string,
  donationUrl: string,
  ads?: Ads,
): Html {
  const { name } = texts.categories[dilemma.category];
  const args = dilemma.arguments;
  const argued = (optionId: string) => args.options.find((option) => option.optionId === optionId);
  return html`${ads ? adUnit('top', ads, texts) : ''}
    <nav class="crumbs" aria-label="breadcrumb">
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
          <a
            class="button primary"
            href="${appBase}/vote/${dilemma.publicId}?lang=${dilemma.language}&back=${encodeURIComponent(path)}"
            >${icon('how-to-vote')}${texts.dilemma.vote}</a
          >
          <a class="button" href="${appBase}/new/${dilemma.publicId}?lang=${dilemma.language}"
            >${icon('groups')}${texts.dilemma.play}</a
          >
        </div>
        <p class="world-later">${texts.dilemma.worldResultLater}</p>
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
        <p class="support-line">
          ${texts.support.line} <a href="${donationUrl}">${texts.support.link}</a>
        </p>
        ${ads ? adUnit('side', ads, texts) : ''}
      </section>`}
    </div>
    ${ads ? adUnit('phone', ads, texts) : ''}
    <a class="more" href="${categoryPath(dilemma.language, name)}"
      >${texts.dilemma.moreOf(name)}</a
    >`;
}

export function goneBody(language: string, category: Category, texts: SiteTexts): Html {
  const { name } = texts.categories[category];
  return html`<img class="scene" src="${assetPath('doubting-at-track-end.svg')}" alt="" />
    <h1>${texts.gone.heading}</h1>
    <p class="intro">${texts.gone.body}</p>
    <a class="button primary" href="${categoryPath(language, name)}">${texts.gone.moreOf(name)}</a>
    <a class="button" href="${homePath(language)}">${texts.homeLink}</a>`;
}

export function notFoundBody(language: string, texts: SiteTexts): Html {
  return html`<img class="scene" src="${assetPath('doubting-at-track-end.svg')}" alt="" />
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

/**
 * The paragraphs of a section in their order, with each run of those that start with "- " together,
 * as the items of one list.
 */
function blocksOf(paragraphs: readonly string[]): (string | string[])[] {
  const blocks: (string | string[])[] = [];
  for (const paragraph of paragraphs) {
    const last = blocks.at(-1);
    if (!paragraph.startsWith('- ')) blocks.push(paragraph);
    else if (Array.isArray(last)) last.push(paragraph);
    else blocks.push([paragraph]);
  }
  return blocks;
}

/** A page of its own: its sections, with the paragraphs that start with "- " as a list. */
export function ownPageBody(page: OwnPage, owner: Owner): Html {
  return html`<article class="own-page">
    <h1>${page.title}</h1>
    ${page.sections.map(
      ({ heading, paragraphs, table }) =>
        html`<h2>${heading}</h2>
          ${blocksOf(paragraphs).map((block) =>
            Array.isArray(block)
              ? html`<ul>
                  ${block.map((item) => html`<li>${withOwner(item.slice(2), owner)}</li>`)}
                </ul>`
              : html`<p>${withOwner(block, owner)}</p>`,
          )}
          ${table ? tableOf(heading, table) : ''}`,
    )}
    <p class="updated">${page.updated}</p>
  </article>`;
}

/**
 * A table of a page of its own, which scrolls sideways inside its box on a narrow screen instead of
 * the page; the box takes the focus, so it can be scrolled with the keyboard too.
 */
function tableOf(
  heading: string,
  { headers, rows }: NonNullable<OwnPage['sections'][number]['table']>,
): Html {
  return html`<div class="table" role="region" aria-label="${heading}" tabindex="0">
    <table>
      <thead>
        <tr>
          ${headers.map((header) => html`<th scope="col">${header}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${rows.map(
          (row) =>
            html`<tr>
              ${row.map((cell) => html`<td>${cell}</td>`)}
            </tr>`,
        )}
      </tbody>
    </table>
  </div>`;
}
