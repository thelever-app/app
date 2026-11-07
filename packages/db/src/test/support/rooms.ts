import { Room, type GameSettings, type IdGenerator } from '@thelever-app/game';
import { SequentialRandomness } from '@thelever-app/game/in-memory';

/** What a test game copies from its room. */
export const TEST_GAME_SETTINGS: GameSettings = {
  variant: 'nominal',
  groupNature: 'friends',
  place: 'together',
  dilemmaLanguage: 'es',
  totalTimeInMinutes: 6,
};

/**
 * A room in the lobby hosted by `host`, with `guests` joined in order; each one uses the app with
 * the identity `Test<name>Identity`. Two rooms saved in the same test need different codes.
 */
export function roomOf(
  host: string,
  guests: readonly string[],
  idGenerator: IdGenerator,
  code = 'K7M2Q',
): Room {
  const randomness = new SequentialRandomness();
  const room = Room.create(
    {
      hostNickname: host,
      hostIdentity: `Test${host}Identity`,
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: 'es',
      code,
    },
    idGenerator,
    randomness,
  );
  for (const guest of guests) {
    room.join({ nickname: guest, identity: `Test${guest}Identity` }, idGenerator, randomness);
  }
  return room;
}
