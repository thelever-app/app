import type { OwnPage } from '../site-texts.ts';

const UPDATED = '19 November 2026';

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
        'Dilemmas can deal with hard topics. 18+ dilemmas are only played in rooms with 18+ dilemmas, which only people 18 or over can join. Compromising dilemmas, whose honest answer can show you up before someone in the room, are only played in anonymous rooms and if whoever runs the room turns them on.',
      ],
    },
    {
      heading: 'Rules',
      paragraphs: [
        'By using TheLever you agree not to use nicknames with illegal, hateful or harassing content, that humiliate anyone or that carry the data of other people; not to try to find out what each person voted in an anonymous room; and not to use automated programs, overload the service, get around the age or country restrictions, or access data or parts of the system that are not meant for you.',
      ],
    },
    {
      heading: 'Moderation and reports',
      paragraphs: [
        'Any player can report a dilemma from the game, and our team reviews it. If you breach these terms, we can replace your nickname with a generic one or stop your access, and we will tell you the reason, the facts, the rule applied and how to appeal.',
        'Anyone, whether they play or not, can report illegal content by writing to privacidad@thelever.app, which is also the point of contact for the authorities.',
      ],
    },
    {
      heading: 'Ads',
      paragraphs: [
        'TheLever shows ads, never while you vote, and ads never get anything of what you vote. They are only personalised for people 18 or over who accept it in the cookie manager and whose browser does not send the Global Privacy Control signal. We are not responsible for the content of the ads or for the websites they lead to, but you can tell us about any inappropriate ad.',
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
        'TheLever is free and offered as it is. We try to make it work well, but it may have faults or interruptions, and we may change, pause or close the service, giving you reasonable notice if it closes.',
        'We are not liable for damage not caused by our wilful misconduct or gross negligence, as far as the law allows. Nothing here limits your rights under consumer law. You are responsible for the nicknames you use.',
      ],
    },
    {
      heading: 'Stopping playing',
      paragraphs: [
        'You can stop using TheLever whenever you want and ask us to delete your data by writing to privacidad@thelever.app. If you breach these terms seriously or repeatedly, we can stop your access, with the reasons explained in the section on moderation.',
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
        'These terms are governed by Spanish law. If you are a consumer, you can bring a claim before the courts of where you live and you keep the protection of the consumer law of your country. Version 1.',
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
        'Playing requires your explicit consent, because what you vote on moral dilemmas can reveal your beliefs and, in some dilemmas, something about your private life. What you answer in a game is deleted within 24 hours of the room closing. We do not use your data for research or sell it to anyone, and ads never get what you vote.',
      ],
    },
    {
      heading: 'What data we process, why and on what basis',
      paragraphs: [
        '- To play, with your explicit consent (art. 6.1.a and 9.2.a GDPR): your nickname and avatar; your votes, your predictions of the others’ votes or of the group’s split, your reactions and your points; whether a dilemma was about you; the order in which you saw the options and how long you took to answer; and your “Good dilemma” likes, which are kept apart from the room.',
        '- To vote a dilemma of the website alone, with the same consent: your vote adds to the world result without us keeping what you voted, and only a mark that you already voted that dilemma is kept, so it does not count twice.',
        '- Not to repeat dilemmas, with the same consent: your phone keeps the list of dilemmas you have played, without your votes, and sends it when you join a room, which only uses it to put the games together and deletes it with the room.',
        '- To recognise you, under the terms of use (art. 6.1.b): an anonymous identifier of your device and when you last opened the app.',
        '- To comply with the law on age (art. 6.1.c): your year of birth and, if you turn 18 this year or later, the month; and your region (European Economic Area, rest of the world or a country where TheLever is not available), which we work out from your IP address with a database on our own server, IP Geolocation by DB-IP (db-ip.com, CC BY 4.0 licence). TheLever does not keep your IP; our sign-in provider, Firebase Authentication (Google), logs it for a few weeks for security.',
        '- To be able to prove what you accepted (art. 6.1.c and 7.1): which version of the terms and of the consent you accepted and when.',
        '- For the ads, with your consent (art. 6.1.a GDPR and art. 22.2 LSSI): the cookies and identifiers of the ad network, according to what you choose in Google’s cookie manager.',
        '- To moderate (legal obligation under the Digital Services Act and legitimate interest in a safe service, art. 6.1.c and 6.1.f): the dilemma you report, the reason and your comment, without telling anyone in the group that you reported it.',
        '- To handle your requests (art. 6.1.c): your email and what you ask us.',
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
        'To play you must be at least 16 in the European Economic Area and 18 in the rest of the world. Players aged 16 and 17 only play dilemmas suited to their age, cannot join rooms with 18+ dilemmas and their ads are never personalised. If the age you declare is under the minimum, we only keep your year of birth, the month if you gave it, your region and when you last opened the app, so that you cannot play on that device, and we delete it after 24 months without opening the app. If we learn in some other way that someone is under the minimum age, we delete their data.',
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
        'We do not sell your data. They are processed on our behalf, under contract and only to provide the service, by Google Cloud and Firebase (Google), which host the app, its database and the sign-in, and by Hostinger, which hosts our email. The cookie manager is Google’s, and the ad network and its partners process their cookies as controllers on their own account, only if you accept it. We may also have to give data to the authorities when the law requires it.',
        'If TheLever changes owner, for example when it becomes a company, your data will pass to the new owner to keep providing you the same service, with the same purposes and safeguards (art. 21 of the LOPDGDD). We will tell you in the app before the change and you can ask us to delete them before.',
      ],
    },
    {
      heading: 'Transfers outside the European Economic Area',
      paragraphs: [
        'Google may process data in the United States, under the EU-US Data Privacy Framework and the standard contractual clauses of the European Commission.',
      ],
    },
    {
      heading: 'How long we keep your data',
      paragraphs: [
        '- What you answer in a game: less than 24 hours from the room closing.',
        '- Your “Good dilemma” likes and the mark that you voted alone: until you ask to delete your data or spend 24 months without opening the app.',
        '- Your age, your region and what you accepted: while you use the app and, if you delete your data, a minimal record of what you accepted for 3 years.',
        '- Your cookie choices: what Google’s cookie manager sets, 13 months at most.',
        '- What we delete stays a few days in the backups: 7 days in ours and up to 180 in Firebase’s. Meanwhile it is not used for anything.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'You can ask for access to your data, correct it, delete it, restrict its use, take it with you and object to its processing, and withdraw the game consent whenever you want, without affecting what was already processed. Write to privacidad@thelever.app; since you play without an account, if we cannot check that the request is yours we will ask you for what we need to do so. We answer within one month at most.',
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
        'We encrypt data in transit and at rest, give the least access to it, do not keep your IP in our databases and delete games on their own. If there were a breach that affects you, we would tell you and tell the AEPD when the law requires it.',
        'If we change this policy significantly, we will tell you in the app before it affects you, and if the change needs your consent, we will ask you for it again.',
      ],
    },
  ],
};
