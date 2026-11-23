import type { OwnPage } from '../site-texts.ts';

const UPDATED = '23 November 2026';

/** The terms of use of the app, version 1, which the first access asks to accept. */
export const terms: OwnPage = {
  title: 'Terms of use',
  description: 'The terms to play TheLever: who can play, how it works and what the rules are.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Who provides the service',
      paragraphs: [
        'TheLever is a service of {owner}. Their full details are in the legal notice. For anything, write to privacidad@thelever.app: we answer in Spanish and in English.',
      ],
    },
    {
      heading: 'What TheLever is',
      paragraphs: [
        'TheLever is a free game to play moral dilemmas with your group from the browser. It is paid for with ads. By accepting these terms you enter into an agreement with us; how we process your data is explained in the privacy policy of the app.',
      ],
    },
    {
      heading: 'Who can play',
      paragraphs: [
        'You must be at least 16 if you are in the European Economic Area and 18 if you are anywhere else. Declaring a false age breaches these terms.',
        'TheLever is not available in some countries: those under European Union sanctions that reach the whole country, Russia, China, Brazil and, for now, the United Kingdom.',
        'You play without an account, with an anonymous identifier of your device. You are responsible for what is done from it.',
      ],
    },
    {
      heading: 'How the game works',
      paragraphs: [
        'In each room, the group answers the same dilemmas at the same time and finds out the result of each one. In a nominal room, everyone sees what each person voted; in an anonymous room, only how many chose each option. What you answer in a game is deleted within 24 hours of the room closing.',
        'Dilemmas can deal with hard topics. 18+ dilemmas are only played in rooms with 18+ dilemmas, which only people 18 or over can join. Compromising dilemmas, whose honest answer could expose you to someone in the room, are only played in anonymous rooms and if whoever runs the room turns them on.',
      ],
    },
    {
      heading: 'Rules',
      paragraphs: [
        'By using TheLever you agree not to use nicknames with illegal, hateful or harassing content, that humiliate anyone or that contain other people’s personal data; not to try to find out what each person voted in an anonymous room; and not to use automated programs, overload the service, get around the age or country restrictions, or access data or parts of the system that are not meant for you.',
      ],
    },
    {
      heading: 'Moderation and reports',
      paragraphs: [
        'Any player can report a dilemma or a nickname from the game, and our team reviews it. If you breach these terms, we can replace your nickname with a generic one or stop your access, and we will tell you the reason, the facts, the rule applied and how to appeal.',
        'Anyone, whether they play or not, can report illegal content by writing to privacidad@thelever.app, which is also the point of contact for the authorities.',
      ],
    },
    {
      heading: 'Ads',
      paragraphs: [
        'TheLever shows ads, never while you vote, and ads never receive anything about how you vote. They are only personalised for people 18 or over who accept it in the cookie manager and whose browser does not send the Global Privacy Control signal. We are not responsible for the content of the ads or for the websites they lead to, but you can tell us about any inappropriate ad.',
      ],
    },
    {
      heading: 'What is ours',
      paragraphs: [
        'The name and brand TheLever, its design and the dilemmas our team writes are ours, unless another licence is stated. The code of the app is open, under the AGPL-3.0 licence, at github.com/thelever-app. Avatars are made with DiceBear.',
      ],
    },
    {
      heading: 'Availability and liability',
      paragraphs: [
        'TheLever is free and provided as is. We try to make it work well, but it may have faults or interruptions, and we may change, pause or close the service, giving you reasonable notice if it closes.',
        'We are not liable for damage not caused by our wilful misconduct or gross negligence, as far as the law allows. Nothing here limits your rights under consumer law. You are responsible for the nicknames you use.',
      ],
    },
    {
      heading: 'Stopping playing',
      paragraphs: [
        'You can stop using TheLever whenever you want and delete your data in Settings → Privacy and data → Delete my data. If you breach these terms seriously or repeatedly, we can stop your access, with the reasons explained in the section on moderation.',
      ],
    },
    {
      heading: 'Changes to these terms',
      paragraphs: [
        'If we change them significantly, we will tell you in the app and you will have to accept them again before you keep playing. If you do not accept them, you can ask us to delete your data.',
      ],
    },
    {
      heading: 'Governing law',
      paragraphs: [
        'These terms are governed by Spanish law. If you are a consumer, you can bring a claim before the courts where you live and you keep the protection of the consumer law of your country. Version 1.',
      ],
    },
  ],
};

/** The privacy policy of the app, which the game consent links to. */
export const appPrivacy: OwnPage = {
  title: 'App privacy',
  description:
    'What data the TheLever app processes to play, on what basis, for how long and what your rights are.',
  updated: UPDATED,
  sections: [
    {
      heading: 'Who is responsible',
      paragraphs: [
        'TheLever is a project of {owner}. For anything about your data, write to privacidad@thelever.app. We answer in Spanish and in English.',
      ],
    },
    {
      heading: 'The essentials',
      paragraphs: [
        'Playing requires your explicit consent, because what you vote on moral dilemmas can reveal your beliefs and, in some dilemmas, something about your private life. What you answer in a game is deleted within 24 hours of the room closing. We do not use your data for research or sell it to anyone, and ads never receive how you vote.',
      ],
    },
    {
      heading: 'What data we process, why and on what basis',
      paragraphs: [
        '- To play, with your explicit consent (art. 6.1.a and 9.2.a GDPR): your nickname and avatar; your votes, your predictions of the others’ votes or of the group’s split, your reactions and your points; whether a dilemma was about you; and the order in which you saw the options.',
        '- To vote alone on a dilemma of the website, with the same consent: your vote adds to the world result without us keeping what you voted.',
        '- Not to repeat dilemmas, with the same consent: your phone keeps the list of dilemmas you have played, without your votes, and sends it when you join a room, which only uses it to put the games together and deletes it with the room.',
        '- To rate which dilemmas people like and so that nobody counts twice in the world result, on the basis of legitimate interest (art. 6.1.f): your “Good dilemma” likes, which are kept apart from the room, and the mark that you already voted alone on a dilemma, without your vote. They do not say what you chose nor reveal your beliefs, so they do not depend on the game consent and stay if you withdraw it. You can object by writing to us with your request code, and we delete them.',
        '- To recognise you, under the terms of use (art. 6.1.b): an anonymous identifier of your device and when you last opened the app.',
        '- To protect the service from abuse and automated programs, on the basis of legitimate interest (art. 6.1.f): each time you come in, Firebase App Check checks with Google’s reCAPTCHA Enterprise that the request comes from the real app; to do so, Google analyses technical data of your browser and of how you use the page, and keeps a token and a cookie in it, as the cookies policy of the app explains.',
        '- To comply with the law on age (art. 6.1.c): your year of birth and, if you turn 18 this year or later, the month; and your region (European Economic Area, rest of the world or a country where TheLever is not available), which we work out from your IP address with a database on our own server, IP Geolocation by DB-IP (db-ip.com, CC BY 4.0 licence). TheLever does not keep your IP; our sign-in provider, Firebase Authentication (Google), logs it for a few weeks for security.',
        '- To be able to prove what you accepted (art. 6.1.c and 7.1): which version of the terms and of the consent you accepted and when, and when you withdrew it.',
        '- To measure use and improve the game, on the basis of legitimate interest (art. 6.1.f): when you first opened the app and which link brought you (for example, the one on a poster); when you create a room or join someone else’s; when a game starts and ends and with how many players; and how long you and the group take to answer each dilemma, which is deleted with the game. Never your votes, your predictions or your reactions, and without cookies: our server records it. The first visit is recorded before you have been able to object. You can object in Settings → Privacy and data → Your permissions: we stop recording it and delete the events we had; the times of the games still kept are deleted with them.',
        '- For the ads, with your consent (art. 6.1.a GDPR and art. 22.2 LSSI): the cookies and identifiers of the ad network, according to what you choose in Google’s cookie manager. What the app keeps on your device, and how to change it, is in the cookies policy of the app (thelever.app/en/app-cookies).',
        '- To moderate (legal obligation under the Digital Services Act and legitimate interest in a safe service, art. 6.1.c and 6.1.f): the dilemma or nickname you report, the reason and your comment, without telling anyone in the group that you reported it; if your nickname is reported, the nickname and our decision; if you report illegal content from the website, what you tell us and, if you give them to us, your name and email so we can reply; and the notices of each decision.',
        '- To handle your requests (art. 6.1.c): your email, what you ask us and the request code we give you when you first open the app, which you can see in Settings → Privacy and data → Your data.',
        '- So that a deletion is not undone if we restore a backup (art. 6.1.c and 17): your anonymous identifier, the reason for the deletion, and when you asked for it and when it was completed.',
        '- If you support us with a donation on Ko-fi (Ko-fi Labs Limited, United Kingdom): Ko-fi gives us your name or username, your email, the amount and the message you write. We use them to handle and thank you for your donation, on the basis of legitimate interest (art. 6.1.f), and to meet our tax obligations (art. 6.1.c). We never link them to your identifier or to anything you do in the app. Ko-fi and whoever processes the payment (PayPal or Stripe) process your data on their own account, under their own policies.',
      ],
    },
    {
      heading: 'What your group sees',
      paragraphs: [
        'In a nominal room, your group sees in the reveal what you voted, how many guessed your vote and your reactions, and at the end your position and the titles of the game, which come from the votes, the predictions and the reactions. In an anonymous room, nobody sees your vote or your prediction: only how many chose each option and, if fewer than 3 people voted, not even that. When you vote alone, nobody sees your vote: only the world count, without names, from 20 answers.',
        'Any player can share a card with the result outside the room: the personal one does not show the nicknames of the others unless whoever shares it chooses so, and the group one only shows the split, without names.',
      ],
    },
    {
      heading: 'Minors',
      paragraphs: [
        'To play you must be at least 16 in the European Economic Area and 18 in the rest of the world. Players aged 16 and 17 only play dilemmas suited to their age, cannot join rooms with 18+ dilemmas and their ads are never personalised. If the age you declare is under the minimum, we only keep your year of birth, the month if you gave it, your region, when you last opened the app, your request code and the record of your first visit, so that you cannot play on that device, and we delete it after 24 months without opening the app. If we learn in some other way that someone is under the minimum age, we delete their data.',
      ],
    },
    {
      heading: 'Automated decisions',
      paragraphs: [
        'The app does not let you play if the age you declare does not reach the minimum of your region or if you are in a country where it is not available. If you think it is a mistake, write to us and a person will review it. We take no other automated decision about you.',
      ],
    },
    {
      heading: 'Who we share your data with',
      paragraphs: [
        'We do not sell your data. They are processed on our behalf, under contract and only to provide the service, by Google Cloud and Firebase (Google), which host the app, its database and the sign-in; Hostinger, which hosts our email and sends our emails; and Anthropic, which translates into your language the explanation of a moderation decision. The cookie manager is Google’s, and the ad network and its partners process their cookies as controllers on their own account, only if you accept it. We may also have to give data to the authorities when the law requires it.',
        'If TheLever changes owner, for example when it becomes a company, your data will pass to the new owner to keep providing you the same service, with the same purposes and safeguards (art. 21 of the LOPDGDD). We will tell you in the app before the change and you can ask us to delete them before.',
      ],
    },
    {
      heading: 'Transfers outside the European Economic Area',
      paragraphs: [
        'Google and Anthropic may process data in the United States: Google under the EU-US Data Privacy Framework and the standard contractual clauses of the European Commission; Anthropic under those same clauses, which are part of its contract. Hostinger keeps our email in the European Union.',
      ],
    },
    {
      heading: 'How long we keep your data',
      paragraphs: [
        '- What you answer in a game: less than 24 hours from the room closing.',
        '- Your “Good dilemma” likes and the mark that you voted alone: until you ask to delete your data, object or spend 24 months without opening the app.',
        '- Your age, your region, your request code and what you accepted: while you use the app and, if you delete your data, a minimal record of what you accepted for 3 years.',
        '- Usage data with your identifier: 13 months; after that, only totals that do not identify you.',
        '- Reports, notices of illegal content, moderation decisions and their notices, your requests with our answers and the record of your deletions: 3 years. If you delete your data, the reports and notices you made are left with no link to you.',
        '- Your cookie choices: what Google’s cookie manager sets, 13 months at most.',
        '- The data of a donation: as long as tax law requires, generally 4 years.',
        '- What we delete stays a few days in the backups: 7 days in ours and up to 180 in Firebase’s. Meanwhile it is not used for anything.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'You can ask for access to your data, correct it, delete it, restrict its use, take it with you and object to its processing. In Settings → Privacy and data you can, yourself:',
        '- In “Your permissions”, withdraw the game consent whenever you want, without affecting what was already processed: you will not be able to create or join rooms until you give it again, and we delete what you answered in the games that have not been deleted yet; your “Good dilemma” likes and the marks of your solo votes stay. You can also object to analytics.',
        '- In “Delete my data”, delete it: your phone is left as new at once and we delete everything linked to your identifier within minutes, and within one month at most, except the minimal record of what you accepted and the record of your deletion.',
        'If you withdraw the consent or delete your data, your nickname becomes “Player” in the rooms that are still kept.',
        'For anything else, such as asking for a copy of your data or correcting your age, write to privacidad@thelever.app with the code you see in Settings → Privacy and data → Your data: since you play without an account, it is what lets us know the request is yours, and without it we cannot handle it. If you only reported something to us from the website, write from the email you gave us. We answer within one month at most.',
        'If you think we have not handled your data properly, you can complain to the Spanish Data Protection Agency (aepd.es) or to the authority of your country.',
      ],
    },
    {
      heading: 'If you are outside the European Union',
      paragraphs: [
        'For now TheLever is not available in the United Kingdom. In the United States, we do not sell your personal data or share it for advertising without your consent, and we honour the Global Privacy Control signal of your browser as a rejection of personalised ads.',
      ],
    },
    {
      heading: 'Security and changes',
      paragraphs: [
        'We encrypt data in transit and at rest, give as little access to it as possible, do not keep your IP in our databases and delete games on their own. If there were a breach that affects you, we would tell you and tell the AEPD when the law requires it.',
        'If we change this policy significantly, we will tell you in the app before it affects you, and if the change needs your consent, we will ask you for it again.',
      ],
    },
  ],
};

/** The cookies policy of the app: what it keeps on the device, which its privacy policy links to. */
export const appCookies: OwnPage = {
  title: 'App cookies',
  description:
    'What the TheLever app keeps on your device, what for and how to change what you accept.',
  updated: UPDATED,
  sections: [
    {
      heading: 'What they are',
      paragraphs: [
        'Cookies are small files that a website or an app keeps in your browser and reads again later. This policy also uses “cookies” for similar technologies, such as the browser’s local storage, which is what the app almost always uses.',
      ],
    },
    {
      heading: 'What it keeps without asking you',
      paragraphs: [
        'Only what is essential for the game to work or to remember what you choose, which the law does not subject to consent (art. 22.2 of the Spanish LSSI). Almost all of it belongs to TheLever. What belongs to Firebase and reCAPTCHA Enterprise, by Google, gives us the sign-in and protects the service from automated programs, and what you answer in the cookie manager is kept by Google’s manager.',
      ],
      table: {
        headers: ['Name', 'Whose', 'What for', 'How long'],
        rows: [
          [
            'firebaseLocalStorageDb',
            'Firebase Authentication (Google)',
            'Your session: the anonymous identifier of your device',
            'Until you delete your data or the data of the browser',
          ],
          [
            'firebase-app-check-database',
            'Firebase App Check (Google)',
            'The proof that requests come from the real app, and not from an automated program',
            'A few hours; then a new one is requested',
          ],
          [
            'firebase-heartbeat-database',
            'Firebase (Google)',
            'Which days the Firebase SDK was used and its version, which Google receives to maintain its service',
            'Until you delete the data of the browser',
          ],
          [
            '_GRECAPTCHA (on google.com)',
            'reCAPTCHA Enterprise (Google)',
            'Assessing the risk that whoever uses the app is an automated program',
            '6 months',
          ],
          ['thelever.language', 'TheLever', 'The language you chose', 'The same'],
          ['thelever.muted', 'TheLever', 'Whether you turned the sound off', 'The same'],
          [
            'thelever.cookieConsentAnswered',
            'TheLever',
            'That you already answered the cookie manager',
            'The same',
          ],
          [
            'thelever.personalisedAds',
            'TheLever',
            'Whether ads may be personalised, according to what you accepted',
            'The same',
          ],
          [
            'thelever.lastNickname',
            'TheLever',
            'The last nickname you played with, to suggest it to you',
            'The same',
          ],
          [
            'thelever.playedDilemmas',
            'TheLever',
            'The dilemmas you have played, without your votes, so they are not repeated',
            'The same',
          ],
          [
            'thelever.worldVote.…',
            'TheLever',
            'What you voted and predicted alone, to show you the world result',
            'The same',
          ],
          [
            'thelever.installOfferClosedAt and thelever.lastFinishedGameAt',
            'TheLever',
            'When you closed the offer to install the app and when you finished your last game, so it is not repeated too soon',
            'The same',
          ],
          [
            'thelever.supportCardClosed',
            'TheLever',
            'That you closed the card to support TheLever',
            'The same',
          ],
          [
            'thelever.accessCode',
            'TheLever',
            'The access code, while the app is not open to everyone',
            'Until you delete the data of the browser',
          ],
          [
            'thelever.toldAnonymous',
            'TheLever',
            'That we already told you the room is anonymous',
            'Until you close the tab',
          ],
          [
            'FCCDCF',
            'Google’s cookie manager',
            'Keeping what you answer in the manager',
            '13 months',
          ],
        ],
      },
    },
    {
      heading: 'What needs your consent',
      paragraphs: [
        'Everything else, and only if you accept it in Google’s cookie manager, which asks you the first time you come in:',
        '- The statistics of the manager itself (FCNEC, by Google, 365 days).',
        '- The ads. Today the app shows none. When it does, Google AdSense and its partners will use cookies to show and measure them and, if you are 18 or older and accept it, to personalise them; if your browser sends the Global Privacy Control signal, they are not personalised. They are never chosen from what you vote, and before they arrive this policy will add their cookies.',
        'We do not use analytics cookies: what we measure of the use is recorded by our server, as the privacy policy of the app explains. The Firebase SDK does keep which days it was used and its version, as the table says, without anything of what you do in the game.',
      ],
    },
    {
      heading: 'How to change what you accept',
      paragraphs: [
        'In Settings → Privacy and data → Cookies and ads you open Google’s cookie manager again and change what you accepted as easily as the first time.',
        'Everything else you delete with Settings → Privacy and data → Delete my data, which leaves your phone as new: if you play without an account, the app will treat you as a new device. What Firebase App Check, the Firebase SDK, reCAPTCHA and the cookie manager keep, and the access code, stays until it expires or until you delete the data of the browser in its settings.',
      ],
    },
    {
      heading: 'Third parties and transfers',
      paragraphs: [
        'Firebase and reCAPTCHA Enterprise, by Google, process on our behalf your session and the check that you use the real app. Google and the advertising partners you accept use their cookies as controllers on their own account; the cookie manager follows the Transparency and Consent Framework of IAB Europe and shows you who they are and what each uses your data for.',
        'Google may process data outside the European Economic Area, under the EU-US Data Privacy Framework and the standard contractual clauses of the European Commission.',
      ],
    },
    {
      heading: 'More information',
      paragraphs: [
        'How we handle your data is in the privacy policy of the app. For any question, write to privacidad@thelever.app.',
      ],
    },
  ],
};
