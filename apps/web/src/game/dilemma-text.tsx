import { GAP_MARKER, type GameStateDto } from '@thelever-app/protocol';
import { Fragment } from 'react';
import styles from './dilemma-text.module.css';

interface DilemmaTextProps {
  readonly text: string;
  /** The nickname of the person in the gap "someone in the group", the same for everyone. */
  readonly personInTheGap: string | undefined;
}

/** A text of a dilemma or of an option, with the nickname of the person in the gap highlighted. */
export function DilemmaText({ text, personInTheGap }: DilemmaTextProps) {
  if (personInTheGap === undefined || !text.includes(GAP_MARKER)) return <>{text}</>;
  const parts = text.split(GAP_MARKER);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && <mark className={styles.person}>{personInTheGap}</mark>}
        </Fragment>
      ))}
    </>
  );
}

/** The nickname that takes the gap of the dilemma, if it has one. */
export function personInTheGapOf(
  game: Pick<GameStateDto, 'players'>,
  dilemma: Pick<GameStateDto['dilemmas'][number], 'personInTheGap'>,
): string | undefined {
  return game.players.find(({ playerId }) => playerId === dilemma.personInTheGap)?.nickname;
}
