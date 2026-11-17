import type { SiteTexts } from './site-texts.ts';

const UPDATED = '17 November 2026';

export const en: SiteTexts = {
  languageName: 'English',
  languageMenu: 'Language',
  homeLink: 'Home',
  someoneInYourGroup: 'someone in your group',
  categories: {
    'life-and-death': {
      name: 'Life and death',
      description:
        'Dilemmas where lives are at stake: the trolley, the lifeboat and other choices with no good way out.',
    },
    honesty: {
      name: 'Honesty',
      description:
        'When to tell the truth, when to keep quiet, and what you would hide, from whom and why.',
    },
    loyalty: {
      name: 'Loyalty',
      description:
        'Friends, family and colleagues: how far you owe them when they clash with what you think is right.',
    },
    justice: {
      name: 'Justice',
      description:
        'Punishments, rewards and rules: what is fair when the law, the intention and the outcome disagree.',
    },
    'love-and-relationships': {
      name: 'Love and relationships',
      description:
        'Partners, jealousy, secrets and break-ups: dilemmas about what you would do for someone you love.',
    },
    'work-and-money': {
      name: 'Work and money',
      description:
        'Promotions, salaries, favours and shortcuts: what you would do when money or your career is at stake.',
    },
    'technology-and-the-future': {
      name: 'Technology and the future',
      description:
        'Artificial intelligence, privacy, robots and genetics: dilemmas that were science fiction not long ago.',
    },
  },
  home: {
    title: 'TheLever: moral dilemmas to play with your group',
    description:
      'Moral dilemmas to play with your people: everyone votes in private, predicts what the others will vote, and then you find out together who thinks what.',
    heading: 'Moral dilemmas to play with your people',
    intro:
      'Everyone votes in private on their phone, predicts what the others will vote, and then you find out together who thinks what. Free, nothing to install.',
    play: 'Play now',
    scene: 'La Palanca, waving next to a railway junction',
    howToPlay: 'How to play',
    steps: [
      'Create a room and share the link or the code.',
      'In each round, you all vote on the same dilemma in private and predict the others.',
      'The result is revealed and you talk it over. At the end, the titles of the game.',
    ],
    categories: 'Categories',
  },
  category: {
    heading: (name) => `Moral dilemmas of ${name.toLowerCase()}`,
    description: (name) =>
      `Moral dilemmas of ${name.toLowerCase()} to play with your group on TheLever.`,
    options: (count) => `${count} options`,
    withArguments: 'arguments for each one',
  },
  dilemma: {
    vote: 'Vote and see what the world did',
    play: 'Play it with my group',
    worldResultLater: 'You see the world result after voting, so it does not sway your answer.',
    arguments: 'Arguments for each option',
    for: 'For:',
    against: 'Against:',
    byTheTeam: 'Text by the TheLever team.',
    ad: 'Advertisement',
    moreOf: (name) => `More dilemmas of ${name.toLowerCase()}`,
  },
  gone: {
    title: 'This dilemma is no longer on TheLever',
    heading: 'This dilemma is no longer on TheLever',
    body: 'We have taken it out of the catalog. If someone sent you this link, many others are waiting for you.',
    moreOf: (name) => `See dilemmas of ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'This page does not exist',
    heading: 'This page does not exist',
    body: 'The address may be mistyped. From the home page you reach every dilemma.',
  },
  footer: { label: 'Legal information', manageCookies: 'Manage cookies' },
  privacy: {
    title: 'Privacy',
    description: 'What data the public web of TheLever processes, what for, and your rights.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Who is responsible',
        paragraphs: [
          'TheLever is a project of {owner}. For anything about your data, write to privacidad@thelever.app. We answer in Spanish and in English.',
        ],
      },
      {
        heading: 'What data we process on this web',
        paragraphs: [
          'This web only shows dilemmas: it has no accounts, forms or cookies of its own, and it asks you for no data.',
          'To send you each page, our hosting provider, Google Cloud (Firebase Hosting and Cloud Run), receives what your browser sends on any visit: your IP address, your browser and the page you ask for. It uses it only to deliver the page and protect it from abuse, for our legitimate interest in a secure service (art. 6.1.f GDPR). TheLever does not keep your IP address in its logs.',
        ],
      },
      {
        heading: 'The app',
        paragraphs: [
          'If you choose to vote on a dilemma or play it with your group, you move to the TheLever app, which explains how it processes your data and asks for your consent before you play.',
        ],
      },
      {
        heading: 'Ads and cookies',
        paragraphs: [
          "The dilemma pages show Google AdSense ads. Before using cookies, Google's cookie manager asks you what you accept, and Google only uses them with your consent (art. 6.1.a GDPR and art. 22.2 LSSI). If you do not accept, you only see limited ads, without cookies.",
          'Ads are only personalised if you accept it: on this web, which does not ask your age, it depends only on that. If your browser sends the Global Privacy Control signal, ads are not personalised even if you accept it. No ad receives what you vote in the app.',
          "When the ads load, even if you accept nothing, Google receives your IP address, your browser's data and the page you visit. Google and its partners are responsible in their own right for what they do with that data and with their cookies, according to what you accept. Which cookies they are and how to change what you accept is in the cookie policy; Google explains it at policies.google.com/technologies/ads.",
        ],
      },
      {
        heading: 'Who we share your data with',
        paragraphs: [
          'We do not sell your data. Google Cloud processes it on our behalf, under contract, only to host the web. Google AdSense and its partners receive it as controllers in their own right, as the section on ads explains. We may also have to give it to the authorities when the law requires us to.',
        ],
      },
      {
        heading: 'Transfers outside the European Economic Area',
        paragraphs: [
          'Google may process data outside the European Economic Area, under the EU-US Data Privacy Framework and the standard contractual clauses of the European Commission.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'TheLever keeps nothing of your visit. Google keeps its technical logs for as long as it needs for the security of the service, and each cookie lasts as long as the cookie policy states.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'You can ask to access your data, correct it, erase it, restrict its use, take it with you or object to its processing by writing to privacidad@thelever.app. We answer within one month at most.',
          'If you think we have not handled your data well, you can complain to the Spanish Data Protection Agency (aepd.es) or to the authority of your country.',
        ],
      },
      {
        heading: 'Changes to this policy',
        paragraphs: [
          'If we change it in an important way, we will say so on this page before it affects you.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookies',
    description:
      'Which cookies are used on the public web of TheLever, what for, and how to change what you accept.',
    updated: UPDATED,
    sections: [
      {
        heading: 'What they are',
        paragraphs: [
          "Cookies are small files that a website stores in your browser and reads again later. This policy also calls similar technologies, such as the browser's local storage, “cookies”.",
        ],
      },
      {
        heading: 'The ones this web uses',
        paragraphs: [
          "TheLever sets no cookies of its own on any page of this web. They are set by Google AdSense, which shows the ads, and by Google's cookie manager, which asks you what you accept. All of them are Google's, as a third party, and they only load on the dilemma pages: the home page, the categories and the legal pages have no ads and no cookies.",
        ],
      },
      {
        heading: 'The ones that do not need your consent',
        paragraphs: [
          'Only the ones that store your choice, to respect it without asking you again on every page: what you answer in the cookie manager (FCCDCF) and, if you do not accept ads with cookies, that you do not accept them (__gpi_optout).',
        ],
      },
      {
        heading: 'The ones that need your consent',
        paragraphs: [
          'All the others, and Google only uses them if you accept it in the cookie manager:',
          '- To show and measure ads: storing and reading information on your device, limiting how many times you see an ad, measuring how it performs and preventing fraud. If you do not accept it, you only see limited ads, without cookies.',
          '- To personalise ads based on your interests. On this web, which does not ask your age, it depends only on whether you accept it. If your browser sends the Global Privacy Control signal, ads are not personalised even if you accept it. They are never chosen based on what you vote in the app.',
          "Google may also store similar information in the browser's local storage, for the same purposes and with the same consent.",
        ],
      },
      {
        heading: 'Cookie table',
        paragraphs: [
          'The names, purposes and durations are the ones Google publishes at business.safety.google/adscookies, which has its full list.',
        ],
        table: {
          headers: ['Cookie', 'Belongs to', 'What for', 'Duration'],
          rows: [
            [
              'FCCDCF',
              "Google's cookie manager",
              'Storing what you answer in the manager',
              '13 months',
            ],
            ['FCNEC', "Google's cookie manager", 'Statistics of the manager', '365 days'],
            ['__gads', 'Google AdSense', 'Ads and security', '13 months'],
            ['__gpi', 'Google AdSense', 'Ads and security', '13 months'],
            [
              '__gpi_optout',
              'Google AdSense',
              'Remembering that you do not accept ads with cookies',
              '13 months',
            ],
            ['__eoi', 'Google AdSense', 'Security', '6 months'],
            [
              'TESTCOOKIESENABLED',
              'Google AdSense',
              'Checking whether your browser accepts cookies',
              '60 seconds',
            ],
            ['IDE', 'Google (doubleclick.net)', 'Ads and security', '13 months'],
            ['id', 'Google (doubleclick.net)', 'Ads, security and operation', '13 months'],
            ['DSID', 'Google (doubleclick.net)', 'Ads, security and operation', '2 weeks'],
            [
              'test_cookie',
              'Google (doubleclick.net)',
              'Checking whether your browser accepts cookies',
              '15 minutes',
            ],
          ],
        },
      },
      {
        heading: 'How to change what you accept',
        paragraphs: [
          "On any dilemma page, with “Manage cookies” at the foot of the page: it opens Google's cookie manager again, where you can withdraw or change your consent as easily as you gave it.",
          'You can also delete or block cookies in the settings of your browser.',
        ],
      },
      {
        heading: 'Third parties and transfers',
        paragraphs: [
          'Google and the advertising partners you accept use their cookies as controllers in their own right. The cookie manager follows the IAB Europe Transparency and Consent Framework and shows you who those partners are and what each one uses your data for.',
          'Google may process data outside the European Economic Area, under the EU-US Data Privacy Framework and the standard contractual clauses of the European Commission. Google explains it at policies.google.com/technologies/ads.',
        ],
      },
      {
        heading: 'More information',
        paragraphs: [
          'How we process your data is in the privacy policy. For any question, write to privacidad@thelever.app.',
        ],
      },
    ],
  },
  legalNotice: {
    title: 'Legal notice',
    description: 'Who is behind TheLever and the terms of this web.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Owner',
        paragraphs: [
          '- Owner: {owner}.',
          '- Tax ID: {taxId}.',
          '- Address: {address}, Spain.',
          '- Email: privacidad@thelever.app.',
          '- Web and app: thelever.app.',
          '- Activity: free online game funded by advertising.',
        ],
      },
      {
        heading: 'Privacy',
        paragraphs: [
          'How we process data on this web is in the privacy policy, and which cookies it uses, in the cookie policy. The app explains its own before you play, and its use is governed by its terms of use, which you accept when you enter.',
        ],
      },
      {
        heading: 'Intellectual property',
        paragraphs: [
          'The TheLever brand, its design and the dilemmas and arguments of our team belong to their owner, unless another licence is stated. The code of the app and of this web is free software under the AGPL-3.0 licence.',
        ],
      },
      {
        heading: 'Links and ads',
        paragraphs: [
          'We do not control the ads or the webs they link to. If any is unlawful or inappropriate, tell us and we will remove it as soon as we know.',
        ],
      },
      {
        heading: 'Illegal content',
        paragraphs: [
          'You can report illegal content by writing to privacidad@thelever.app. It is also the point of contact for authorities and users under the Digital Services Act (arts. 11 and 12), in Spanish and in English.',
        ],
      },
      {
        heading: 'Applicable law',
        paragraphs: [
          'Spanish law. If you are a consumer, you keep the rights the rules of your country give you.',
        ],
      },
    ],
  },
};
