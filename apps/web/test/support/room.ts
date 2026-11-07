import type { RoomStateDto } from '@thelever-app/protocol';

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
      category: 'life-and-death',
      dilemmaCount: 8,
      totalTimeInMinutes: 6,
      newDilemmas: true,
      playersCanAddDilemmas: false,
    },
    minimumPlayers: 2,
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
    addedDilemmas: [],
    ownAddedDilemmaId: null,
    pickedDilemmas: [],
    currentGameId: null,
    ...overrides,
  };
}
