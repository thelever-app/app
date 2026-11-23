import type { Category } from '@thelever-app/dilemmas';

/**
 * A section of a page of its own, such as the privacy policy: a heading and its paragraphs. Who is
 * behind TheLever is not written here but given when the site is generated: `{owner}`, `{taxId}`
 * and `{address}` stand for them.
 */
export interface Section {
  readonly heading: string;
  /** Each one a paragraph; one that starts with "- " is an item of a list. */
  readonly paragraphs: readonly string[];
  /** A table after the paragraphs, such as the cookies the web uses, with a header per column. */
  readonly table?: {
    readonly headers: readonly string[];
    readonly rows: readonly (readonly string[])[];
  };
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
    /** The way into the app, to create a room or join one. */
    readonly play: string;
    /** What the illustration of the home shows, for those who cannot see it. */
    readonly scene: string;
    readonly howToPlay: string;
    readonly steps: readonly { readonly title: string; readonly text: string }[];
    /** The texts of the three screens of the app the steps show in miniature, which only decorate. */
    readonly screens: {
      readonly roomCode: string;
      readonly share: string;
      /** The position of a dilemma, as the app says it. */
      readonly round: string;
      /** A dilemma of example, with its two options. */
      readonly dilemma: string;
      readonly yes: string;
      readonly no: string;
      /** What the app says of the vote, which the group never sees. */
      readonly private: string;
      /** The result of the example, how many said yes and how many each option got. */
      readonly result: string;
      readonly yesCount: string;
      readonly noCount: string;
      /** The predictions of the player that were right. */
      readonly right: string;
    };
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
    /** The label of a space for an ad, which says it is one. */
    readonly ad: string;
    readonly moreOf: (categoryName: string) => string;
  };
  readonly gone: {
    readonly title: string;
    readonly heading: string;
    readonly body: string;
    readonly moreOf: (categoryName: string) => string;
  };
  readonly notFound: { readonly title: string; readonly heading: string; readonly body: string };
  readonly footer: {
    readonly label: string;
    /** What opens again the cookie manager of Google, on the pages that load it. */
    readonly manageCookies: string;
  };
  /** The invitation to support TheLever with a donation, which always says it gives no advantage. */
  readonly support: {
    /** The link to the donation page, in the footer of every page and after each invitation. */
    readonly link: string;
    /** The block that closes the home. */
    readonly heading: string;
    readonly text: string;
    /** The line after the arguments of a dilemma, before its link. */
    readonly line: string;
  };
  readonly privacy: OwnPage;
  readonly cookies: OwnPage;
  readonly legalNotice: OwnPage;
  /** The terms of use of the app, which its first access asks to accept. */
  readonly terms: OwnPage;
  /** The privacy policy of the app, which its game consent links to. */
  readonly appPrivacy: OwnPage;
  /** The cookies policy of the app: what it keeps on the device. Its privacy policy links to it. */
  readonly appCookies: OwnPage;
}
