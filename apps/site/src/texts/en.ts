import { appCookies, appPrivacy, terms } from './legal/en.ts';
import type { SiteTexts } from './site-texts.ts';

const UPDATED = '23 November 2026';
const GUIDES_UPDATED = '26 November 2026';

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
      about: [
        'These are the oldest dilemmas in moral philosophy. A runaway trolley, a lifeboat with too few seats, a doctor with five patients waiting for an organ. They force you to choose between lives and leave no clean way out.',
        'Almost all of them pit two ways of thinking against each other. One looks at the outcome and tries to save as many people as possible. The other looks at what you do with your own hands and holds that some things are not done to anyone, even if the final tally comes out ahead.',
        'Played in a group, they teach you something an individual test does not show. The person who pulls the lever without hesitating finds out that their best friend would never do it, and the conversation that follows often lasts longer than the game.',
      ],
    },
    honesty: {
      name: 'Honesty',
      description:
        'When to tell the truth, when to keep quiet, and what you would hide, from whom and why.',
      about: [
        'Lying is wrong, but hardly anyone always tells the truth. These dilemmas explore that middle ground, the white lie, the silence that protects someone and the truth that hurts for no reason.',
        'Behind each one there is a deeper question. Does what the other person knows matter more than how they feel? Some believe the truth is a duty with no exceptions, and others see it as a tool to be used with care.',
        'They are ideal for finding out exactly where each of your friends draws the line, and for realising that the line moves depending on who you have to lie to.',
      ],
    },
    loyalty: {
      name: 'Loyalty',
      description:
        'Friends, family and colleagues: how far you owe them when they clash with what you think is right.',
      about: [
        'Loyalty is what binds us to our family, our friends and our team. The trouble starts when what you owe someone clashes with what you think is right, with what you owe a stranger or with what you owe yourself.',
        'Would you cover for a friend who has done something serious? Would you report your brother? These dilemmas test how far those bonds reach and what you would be willing to sacrifice for them.',
        'In a group of friends they have a curious effect. You vote in private on what you would do for them, and then, with them right in front of you, you see what they would do for you.',
      ],
    },
    justice: {
      name: 'Justice',
      description:
        'Punishments, rewards and rules: what is fair when the law, the intention and the outcome disagree.',
      about: [
        'Justice seems simple until the law, the intention and the outcome stop lining up. Someone steals to feed their family, a fair rule produces an absurd punishment, a guilty person gets off on a technicality.',
        'These dilemmas pit different ideas of what is fair against each other. For some, it means applying the rules equally to everyone; for others, giving each person what they deserve; and for others still, repairing the harm before punishing whoever caused it.',
        'They spark the most debate in the reveal, because almost everyone is sure what is fair until they hear the reasoning of someone who voted the other way.',
      ],
    },
    'love-and-relationships': {
      name: 'Love and relationships',
      description:
        'Partners, jealousy, secrets and break-ups: dilemmas about what you would do for someone you love.',
      about: [
        'Partners, jealousy, secrets, break-ups and friendships that get complicated. They are small dilemmas next to a runaway trolley, but they are the ones we actually come across in life.',
        'They pit honesty against care, each person’s freedom against their commitment to the other, and what you feel against what you think you should feel.',
        'Playing them with your people is a little risky, and that is the fun of it. You vote in private, but you all try to guess what everyone else chose.',
      ],
    },
    'work-and-money': {
      name: 'Work and money',
      description:
        'Promotions, salaries, favours and shortcuts: what you would do when money or your career is at stake.',
      about: [
        'Promotions, salaries, favours, company mistakes in your favour and colleagues who take advantage. Money and your career test principles that seem solid in the abstract.',
        'Some of these dilemmas have a structure well known in game theory. If everyone cooperates, everyone wins, but whoever takes advantage wins even more. Do you trust the others or protect yourself?',
        'They are a way to find out who in the group would hand back the extra money, who would negotiate ruthlessly and who would quit a company on principle.',
      ],
    },
    'technology-and-the-future': {
      name: 'Technology and the future',
      description:
        'Artificial intelligence, privacy, robots and genetics: dilemmas that were science fiction not long ago.',
      about: [
        'Artificial intelligence, privacy, self-driving cars, gene editing and ever longer lives. Not long ago they were science fiction, and today they are decisions someone is making.',
        'These dilemmas raise new questions with old tools. Should a self-driving car protect its passenger or the pedestrians? Would you tell your secrets to a machine that understands you better than anyone?',
        'Many still have no answer that most people accept, so your group’s result can be as interesting as any survey.',
      ],
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
      { title: 'Create the room', text: 'Share the link or the code and let your people in.' },
      {
        title: 'Vote and predict',
        text: 'In each round, you all vote on the same dilemma in private and predict the others.',
      },
      {
        title: 'Find out who thinks what',
        text: 'The result is revealed and you talk it over. At the end, the titles of the game.',
      },
    ],
    screens: {
      roomCode: 'Room code',
      share: 'Share link',
      round: 'Dilemma 2 of 6',
      dilemma: 'Would you lie to save a friend’s job?',
      yes: 'Yes, I would lie',
      no: 'No, I would tell the truth',
      private: 'Nobody in the group will see your vote',
      result: '3 of 5 said yes',
      yesCount: 'Yes · 3',
      noCount: 'No · 2',
      right: 'You got Ana and Luis right',
    },
    categories: 'Categories',
  },
  category: {
    heading: (name) => `Moral dilemmas of ${name.toLowerCase()}`,
    description: (name) =>
      `Moral dilemmas of ${name.toLowerCase()} to play with your group on TheLever.`,
  },
  dilemma: {
    vote: 'Vote and see what the world did',
    play: 'Play it with my group',
    worldResultLater: 'You see the world result after voting, so it does not sway your answer.',
    atStake: 'What is at stake',
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
    body: 'We have taken it out of the catalog.',
    moreOf: (name) => `See dilemmas of ${name.toLowerCase()}`,
  },
  notFound: {
    title: 'This page does not exist',
    heading: 'This page does not exist',
    body: 'The address may be mistyped. From the home page you reach every dilemma.',
  },
  footer: { label: 'Legal information', manageCookies: 'Manage cookies' },
  support: {
    link: 'Support TheLever',
    heading: 'TheLever is free',
    text: 'It is run by one person. If you like it, you can support it with a donation; it gives no advantage in the game.',
    line: 'Did it make you think? TheLever is free and run by one person. Donating gives no advantage in the game.',
  },
  guidesHeading: 'Learn more',
  guides: {
    trolleyProblem: {
      title: 'What is the trolley problem',
      description:
        'The trolley problem, where it comes from, its best-known variants and what philosophy and psychology have learned from it.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'The dilemma',
          paragraphs: [
            'A runaway trolley is heading towards five people tied to the track. You are standing next to a lever that switches it onto another track, where there is only one person. If you do nothing, five die. If you pull the lever, one dies. What do you do?',
            'Put this way, most people say they would pull the lever. Saving five at the cost of one seems the most reasonable thing to do. The dilemma gets interesting when the details change and those same people change their minds.',
          ],
        },
        {
          heading: 'Where it comes from',
          paragraphs: [
            'The British philosopher Philippa Foot posed it in 1967 in an article on the doctrine of double effect. In her version, the one who decides is the driver of the trolley, who can steer onto one track or the other. Foot used it to ask whether there is a moral difference between causing harm and allowing it to happen.',
            'The American philosopher Judith Jarvis Thomson gave it the name it is known by, “the trolley problem”, in a 1976 article. She was the one who put the lever in the hands of a bystander and who proposed the most famous variant, the footbridge.',
          ],
        },
        {
          heading: 'The footbridge variant',
          paragraphs: [
            'This time there is no lever. You are on a footbridge over the track, next to a very large person. If you push them, their body will stop the trolley and save the five people. They will die.',
            'The numbers are the same as before, one for five. Yet most people say they would not push. Explaining why two cases with the same outcome feel so different to us has been one of the great problems of ethics for decades.',
          ],
        },
        {
          heading: 'The two big answers',
          paragraphs: [
            '- Consequentialism, and utilitarianism in particular, judges an action by its results. If fewer people die, the decision is better, with the lever and on the footbridge alike.',
            '- The ethics of duty, whose best-known representative is Immanuel Kant, holds that some things cannot be done to a person even if the outcome is better, such as using them merely as a means. Diverting the trolley may be acceptable, but pushing someone to stop it is not.',
            'The doctrine of double effect, which goes back to Thomas Aquinas, offers a middle path. With the lever, the death of the person on the other track is a foreseen but unintended effect. On the footbridge, the death of the person pushed is the means of saving the others.',
          ],
        },
        {
          heading: 'What psychology says',
          paragraphs: [
            'In 2001, the psychologist Joshua Greene and his team published a study in the journal Science that used MRI brain scans. Dilemmas in which you have to harm someone with your own hands, like the footbridge, activated the brain areas linked to emotion more than impersonal dilemmas, like the lever.',
            'In 2018, MIT’s Moral Machine project published in Nature the results of an online experiment on self-driving cars, with millions of decisions from people in more than two hundred countries and territories. It found preferences shared almost everywhere, such as saving more people, and clear differences between cultures on others.',
          ],
        },
        {
          heading: 'Why it still matters',
          paragraphs: [
            'The trolley problem is a thought experiment. Nobody expects to come across a lever by a railway track, but the questions it raises come up in real decisions, such as sharing out scarce resources in a hospital or programming how a self-driving car reacts to an unavoidable accident.',
            'On TheLever you can play versions of the trolley problem and hundreds more dilemmas with your group, vote in private and then find out who thinks what. The Life and death category gathers the ones closest to the original dilemma.',
          ],
        },
      ],
    },
    playingInAGroup: {
      title: 'How to play moral dilemmas in a group',
      description:
        'How a game of TheLever works, how many people you need, which ambience to choose and how to get the most out of the debate.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'What you need',
          paragraphs: [
            'One phone per person and nothing else. TheLever works in the browser, so there is nothing to install and no account to create. Someone just creates the room and shares the link or the code.',
            'You can play with anything from two to fifty people. With four or five the debate is more intimate, and with a big group the result of each round is more surprising.',
          ],
        },
        {
          heading: 'What a game is like',
          paragraphs: [
            '- Whoever creates the room chooses the ambience and the number of rounds, from one to twelve. The default is eight.',
            '- In each round the same dilemma appears on every phone. Everyone votes in private.',
            '- As well as voting, everyone predicts what the rest of the group voted.',
            '- When everyone has voted, the reveal arrives. You see what the group chose and who got their predictions right, and the debate begins.',
            '- At the end of the game, each player gets a title based on how they voted and how they predicted the others.',
          ],
        },
        {
          heading: 'Which ambience to choose',
          paragraphs: [
            '- Classic, with dilemmas for any group. It is the best option to start with or to play with people you do not know well.',
            '- Spicy, which adds adult topics. Only for people 18 or over.',
            '- No filter, which adds compromising questions. In this room nobody sees what anyone votes.',
          ],
        },
        {
          heading: 'How to get the most out of the debate',
          paragraphs: [
            'The best part of the game is not the vote but what comes after. When the group splits, ask someone from each side to explain their reason in one sentence. Almost always a detail of the dilemma comes up that the other side had not noticed.',
            'There are no right answers. Each dilemma has the best arguments for and against each option on its page, in case the debate gets stuck or you want to know what philosophy says.',
            'Predictions add a second layer. Guessing what your best friend will vote is harder than it seems, and getting it wrong often sparks the best conversation of the night.',
          ],
        },
        {
          heading: 'Who it is for',
          paragraphs: [
            'TheLever is for people aged 16 and over. It works at a dinner with friends, in a philosophy or ethics class, at a team activity or on a video call with people who live far away.',
          ],
        },
      ],
    },
    about: {
      title: 'Who makes TheLever',
      description:
        'Who is behind TheLever, how its dilemmas are written, how it is funded and how to get in touch.',
      updated: GUIDES_UPDATED,
      sections: [
        {
          heading: 'One person',
          paragraphs: [
            'TheLever is made by a single person, who designs it, codes it and selects its dilemmas. It is an independent project, with no investors or company behind it.',
            'It grew out of a simple idea. Moral dilemmas are far more interesting when you discuss them with your people than when you answer them alone in a test.',
          ],
        },
        {
          heading: 'How the dilemmas are made',
          paragraphs: [
            'Every dilemma in the catalog is reviewed by hand before it is published. Some are versions of philosophy classics, like the trolley or the ring of Gyges; most are everyday situations written for TheLever.',
            'The arguments for and against each option are written with the help of artificial intelligence and reviewed one by one in Spanish. The translations into the other languages are done with artificial intelligence.',
            'The arguments never say which option is right. Their aim is for you to understand the best reason behind each position, including that of the option you would not choose.',
          ],
        },
        {
          heading: 'How it is funded',
          paragraphs: [
            'TheLever is free and will stay that way. It is funded by voluntary donations and, later on, by ads as well. Donating gives no advantage in the game.',
          ],
        },
        {
          heading: 'How to get in touch',
          paragraphs: [
            'For any question about your data, write to privacidad@thelever.app. The privacy and legal notice pages, linked at the foot of every page, have all the details of who is responsible for TheLever.',
          ],
        },
      ],
    },
  },
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
        heading: 'Donations',
        paragraphs: [
          'If you support us with a donation on Ko-fi (Ko-fi Labs Limited, United Kingdom), Ko-fi gives us your name or username, your email, the amount and the message you write. We use them to handle and thank you for your donation, on the basis of legitimate interest (art. 6.1.f GDPR), and to meet our tax obligations (art. 6.1.c), and we keep them as long as tax law requires, generally 4 years. We never link them to anything you do in the app. Ko-fi and whoever processes the payment (PayPal or Stripe) process your data on their own account, under their own policies.',
        ],
      },
      {
        heading: 'Ads and cookies',
        paragraphs: [
          "The dilemma pages show Google AdSense ads. Before using cookies, Google's cookie manager asks you what you accept, and Google only uses them with your consent (art. 6.1.a GDPR and art. 22.2 LSSI). If you do not accept, you only see limited ads, without cookies.",
          'Ads are only personalised if you accept it: on this web, which does not ask your age, it depends only on that. If your browser sends the Global Privacy Control signal, ads are not personalised even if you accept it. TheLever does not give Google or its partners what you vote in the app.',
          "When the ads load, even if you accept nothing, Google receives your IP address, your browser's data and the page you visit. We allow it out of our legitimate interest in funding a free game with advertising (art. 6.1.f GDPR), and we answer for that collection together with Google. What Google and its partners then do with that data and with their cookies is their own responsibility, according to what you accept and the Google Ads data protection terms (business.safety.google/adscontrollerterms). Which cookies they are and how to change what you accept is in the cookie policy; Google explains it at policies.google.com/technologies/ads.",
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
  terms,
  appPrivacy,
  appCookies,
};
