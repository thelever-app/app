import type { Category } from '@thelever-app/dilemmas';

/** A section of a page of its own, such as the privacy policy: a heading and its paragraphs. */
export interface Section {
  readonly heading: string;
  /** Each one a paragraph; one that starts with "- " is an item of a list. */
  readonly paragraphs: readonly string[];
}

/** A page of its own, such as the privacy policy. */
export interface OwnPage {
  /** Also what its address is made of. */
  readonly title: string;
  readonly description: string;
  readonly sections: readonly Section[];
  /** When it was last changed, as the page says it. */
  readonly updated: string;
}

/** Every text of the public web in one language. */
export interface SiteTexts {
  /** The name of the language in that language, as the menu of languages shows it. */
  readonly languageName: string;
  readonly languageMenu: string;
  readonly languageMenuNote: string;
  readonly homeLink: string;
  /** What "someone in the group" reads as in a dilemma on the web, where there is no group yet. */
  readonly someoneInYourGroup: string;
  readonly categories: Readonly<
    Record<Category, { readonly name: string; readonly description: string }>
  >;
  readonly home: {
    readonly title: string;
    readonly description: string;
    readonly heading: string;
    readonly intro: string;
    readonly createRoom: string;
    readonly howToPlay: string;
    readonly steps: readonly string[];
    readonly categories: string;
  };
  readonly category: {
    /** The heading of the page of a category, from its name. */
    readonly heading: (name: string) => string;
    readonly description: (name: string) => string;
    readonly options: (count: number) => string;
    readonly withArguments: string;
  };
  readonly dilemma: {
    readonly vote: string;
    readonly play: string;
    readonly worldResultLater: string;
    readonly arguments: string;
    readonly for: string;
    readonly against: string;
    readonly byTheTeam: string;
    readonly moreOf: (categoryName: string) => string;
  };
  readonly gone: {
    readonly title: string;
    readonly heading: string;
    readonly body: string;
    readonly moreOf: (categoryName: string) => string;
  };
  readonly notFound: { readonly title: string; readonly heading: string; readonly body: string };
  readonly footer: { readonly label: string };
  readonly privacy: OwnPage;
  readonly legalNotice: OwnPage;
}
