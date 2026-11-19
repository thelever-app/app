import { GAP_MARKER, type AvatarDto, type GameStateDto } from '@thelever-app/protocol';
import type { TFunction } from 'i18next';
import type { IconName } from '../components/icon.tsx';
import { TITLE_ICONS, soulmatesOf, titlesOf } from './titles.ts';

/** A person on a card: their avatar, and their nickname only if the player shows it. */
export interface CardPerson {
  readonly avatar: AvatarDto;
  readonly name: string | null;
}

/** A title on a card, with whoever won it with the player: the partner of Almas gemelas. */
export interface CardChip {
  readonly icon: IconName;
  /** The name of the title. */
  readonly text: string;
  /** What the chip says: with the nickname of the partner only if the player shows it. */
  readonly shown: string;
  readonly people: readonly CardPerson[];
}

/** A part of a card under its label: people, chips of titles, a text or the bars of a distribution. */
export type CardSection =
  | {
      readonly kind: 'people';
      readonly label: string;
      /** Next to the avatar of whoever the player does not name. */
      readonly someone: string;
      readonly people: readonly CardPerson[];
    }
  | { readonly kind: 'chips'; readonly label: string; readonly chips: readonly CardChip[] }
  | {
      readonly kind: 'dilemma';
      readonly label: string;
      readonly text: string;
      /** Each option, with the token of its colour, as on the dilemma. */
      readonly bars: readonly {
        readonly text: string;
        readonly percent: number;
        readonly color: string;
      }[];
    };

/** What a card says, the same for the image and for who cannot see it. */
export interface CardContent {
  readonly eyebrow: string;
  readonly headline: string;
  readonly subline: string | null;
  readonly sections: readonly CardSection[];
  readonly footer: string;
}

type Translate = TFunction;

/**
 * The card of a player of a nominal room: their place, who knows them best and their titles, with
 * the partner of Almas gemelas. The nicknames of the others only if the player shows them.
 */
export function personalCardOf(game: GameStateDto, t: Translate, showNames: boolean): CardContent {
  const playerOf = (playerId: string) =>
    game.players.find((player) => player.playerId === playerId);
  const personOf = (playerId: string): CardPerson[] => {
    const player = playerOf(playerId);
    return player ? [{ avatar: player.avatar, name: showNames ? player.nickname : null }] : [];
  };
  const mine = game.ranking?.find(({ playerId }) => playerId === game.playerId);
  const knowers = (game.results?.knownBestBy?.playerIds ?? []).flatMap(personOf);
  const partners = soulmatesOf(game.results, game.playerId).flatMap(personOf);
  const chips = titlesOf(game.results, game.playerId).map(({ title }): CardChip => {
    const text = t(`results.titles.${title}`);
    const people = title === 'almas-gemelas' ? partners : [];
    const names = people.flatMap(({ name }) => (name ? [name] : []));
    return {
      icon: TITLE_ICONS[title],
      text,
      shown:
        names.length > 0 ? t('card.withPartner', { title: text, name: names.join(', ') }) : text,
      people,
    };
  });
  return {
    eyebrow: t('card.myGame'),
    headline: mine
      ? t('card.place', { position: mine.position, players: game.ranking?.length ?? 0 })
      : t('card.dilemmas', { count: game.dilemmas.length }),
    subline: mine ? t('card.inAGameOf', { count: game.dilemmas.length }) : null,
    sections: [
      ...(knowers.length > 0
        ? [
            {
              kind: 'people' as const,
              label: t('card.knowsMe'),
              someone: t('card.someone'),
              people: knowers,
            },
          ]
        : []),
      ...(chips.length > 0 ? [{ kind: 'chips' as const, label: t('card.myTitles'), chips }] : []),
    ],
    footer: t('card.footer'),
  };
}

/**
 * The card of the group of an anonymous room: how many dilemmas it played and the one that divided
 * it the most, with how it split; nothing of any player, the gap written as «alguien del grupo».
 */
export function groupCardOf(game: GameStateDto, t: Translate): CardContent {
  const divisive = game.results?.mostDivisiveDilemma;
  const dilemma = game.dilemmas.find(({ dilemmaId }) => dilemmaId === divisive?.dilemmaId);
  const someone = t('pickDilemmas.someone');
  const plain = (text: string) => text.replaceAll(GAP_MARKER, someone);
  const total = divisive?.distribution.reduce((sum, { count }) => sum + count, 0) ?? 0;
  return {
    eyebrow: t('card.ourGame'),
    headline: t('card.dilemmas', { count: game.dilemmas.length }),
    subline: null,
    sections:
      divisive && dilemma && total > 0
        ? [
            {
              kind: 'dilemma',
              label: t('card.mostDivisive'),
              text: plain(dilemma.text),
              bars: divisive.distribution.map(({ optionId, count }) => {
                const index = dilemma.options.findIndex((option) => option.optionId === optionId);
                return {
                  text: plain(dilemma.options[index]?.text ?? ''),
                  percent: Math.round((count / total) * 100),
                  color: optionColor(dilemma.options.length, index),
                };
              }),
            },
          ]
        : [],
    footer: t('card.footer'),
  };
}

/** The token of the colour of an option by its position, as on the dilemma: a and b for two, 1 to 4 for more. */
function optionColor(count: number, index: number): string {
  return count === 2 ? `--color-option-${'ab'[index]}` : `--color-option-${index + 1}`;
}

/** Everyone whose avatar is on the card, in the order it draws them. */
export function peopleOn(content: CardContent): CardPerson[] {
  return content.sections.flatMap((section) =>
    section.kind === 'people'
      ? section.people
      : section.kind === 'chips'
        ? section.chips.flatMap(({ people }) => people)
        : [],
  );
}

/** The card in words, for who cannot see the image: the same lines, in the same order. */
export function describeCard(content: CardContent, t: Translate): string {
  const lines = [content.eyebrow, content.headline, content.subline ?? ''];
  for (const section of content.sections) {
    lines.push(section.label);
    if (section.kind === 'people') {
      lines.push(...section.people.map(({ name }) => name ?? t('card.someone')));
    } else if (section.kind === 'chips') {
      lines.push(
        ...section.chips.map(({ text, people }) =>
          people.length === 0
            ? text
            : t('card.withPartner', {
                title: text,
                name: people.map(({ name }) => name ?? t('card.someone')).join(', '),
              }),
        ),
      );
    } else {
      lines.push(section.text, ...section.bars.map(({ text, percent }) => `${text}: ${percent} %`));
    }
  }
  return lines.filter((line) => line !== '').join('. ');
}
