import type { GameStateDto } from '@thelever-app/protocol';

/** Ana is the player using the screen; three dilemmas of two options each. */
export function aGame(overrides: Partial<GameStateDto> = {}): GameStateDto {
  return {
    type: 'game-state',
    gameId: 'test-game-id',
    gameVersion: 1,
    roomVersion: 2,
    playerId: 'test-ana-id',
    phase: 'decision',
    hostId: 'test-ana-id',
    totalTimeEndsAt: '2026-11-09T10:06:00.000Z',
    serverTime: '2026-11-09T10:00:00.000Z',
    totalTimeRanOut: false,
    dilemmas: [1, 2, 3].map((n) => ({
      dilemmaId: `test-dilemma-${n}`,
      predictionSubset: [],
      personInTheGap: null,
      text: `Texto del dilema ${n}`,
      options: [
        { optionId: `test-option-${n}a`, text: `Opción ${n}A` },
        { optionId: `test-option-${n}b`, text: `Opción ${n}B` },
      ],
    })),
    players: [
      {
        playerId: 'test-ana-id',
        nickname: 'Ana',
        avatar: { face: 'face-01', color: 'teal' },
        progress: 0,
        connected: true,
        left: false,
      },
      {
        playerId: 'test-luis-id',
        nickname: 'Luis',
        avatar: { face: 'face-02', color: 'rust' },
        progress: 1,
        connected: true,
        left: false,
      },
    ],
    answers: [],
    reports: [],
    didNotVote: [],
    ...overrides,
  };
}
