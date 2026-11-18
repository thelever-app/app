import type { RoomStateDto } from '@thelever-app/protocol';

/** The rounds of a new room: 8 random ones from every category. */
export const DEFAULT_ROUNDS: RoomStateDto['rounds'] = Array.from({ length: 8 }, (_, index) => ({
  roundId: index + 1,
  origin: 'random',
  categories: null,
  withoutNewDilemmas: false,
}));

/** Ana hosts a lobby with Luis and Marta, with the default configuration. */
export function aRoom(overrides: Partial<RoomStateDto> = {}): RoomStateDto {
  return {
    type: 'room-state',
    roomId: 'test-room-id',
    roomVersion: 3,
    code: 'K7M2Q',
    playerId: 'test-ana-id',
    hostId: 'test-ana-id',
    groupNature: 'friends',
    place: 'together',
    settings: {
      variant: 'nominal',
      adultsOnly: false,
      dilemmaLanguage: 'es',
      timePerDilemmaSeconds: 60,
      newDilemmas: true,
    },
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
