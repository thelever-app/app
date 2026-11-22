import type { RoomStateDto } from '@thelever-app/protocol';

/** The rounds of a new room: 8 random ones from every category. */
export const DEFAULT_ROUNDS: RoomStateDto['rounds'] = Array.from({ length: 8 }, (_, index) => ({
  roundId: index + 1,
  origin: 'random',
  categories: null,
  content: { age: 'any', compromising: 'any' },
  withoutNewDilemmas: false,
}));

/** The random rounds from every category of an ambience, of these contents in order. */
function presetOf(
  contents: readonly (readonly ['any' | 'adults-only', 'any' | 'yes'])[],
): NonNullable<RoomStateDto['ambiences']>['classic']['rounds'] {
  return contents.map(([age, compromising]) => ({
    origin: 'random',
    categories: null,
    content: { age, compromising },
  }));
}

const ANY = ['any', 'any'] as const;
const ADULTS = ['adults-only', 'any'] as const;
const COMPROMISING = ['any', 'yes'] as const;
const BOTH = ['adults-only', 'yes'] as const;

/** What each ambience sets in a room, as the room server gives it to the host. */
export const AMBIENCES: NonNullable<RoomStateDto['ambiences']> = {
  classic: {
    variant: 'nominal',
    adultsOnly: false,
    compromisingDilemmas: false,
    rounds: presetOf(Array.from({ length: 8 }, () => ANY)),
  },
  spicy: {
    variant: 'nominal',
    adultsOnly: true,
    compromisingDilemmas: false,
    rounds: presetOf([ANY, ADULTS, ANY, ADULTS, ANY, ADULTS, ANY, ADULTS]),
  },
  'no-filter': {
    variant: 'anonymous',
    adultsOnly: true,
    compromisingDilemmas: true,
    rounds: presetOf([ANY, COMPROMISING, ADULTS, BOTH, ANY, COMPROMISING, ADULTS, BOTH]),
  },
};

/** Ana hosts a lobby with Luis and Marta, with the default configuration. */
export function aRoom(overrides: Partial<RoomStateDto> = {}): RoomStateDto {
  return {
    type: 'room-state',
    roomId: 'test-room-id',
    roomVersion: 3,
    code: 'K7M2Q',
    playerId: 'test-ana-id',
    hostId: 'test-ana-id',
    place: 'together',
    settings: {
      variant: 'nominal',
      adultsOnly: false,
      compromisingDilemmas: false,
      timePerDilemmaSeconds: 60,
      newDilemmas: true,
    },
    ambience: 'classic',
    hasPlayerUnderEighteen: false,
    ambiences: AMBIENCES,
    rounds: DEFAULT_ROUNDS,
    minimumPlayers: 2,
    minimumPlayersForTheGap: 3,
    players: [
      {
        playerId: 'test-ana-id',
        nickname: 'Ana',
        avatar: { face: 'face-01', color: 'teal' },
        connected: true,
      },
      {
        playerId: 'test-luis-id',
        nickname: 'Luis',
        avatar: { face: 'face-02', color: 'rust' },
        connected: true,
      },
      {
        playerId: 'test-marta-id',
        nickname: 'Marta',
        avatar: { face: 'face-03', color: 'olive' },
        connected: true,
      },
    ],
    currentGameId: null,
    ...overrides,
  };
}
