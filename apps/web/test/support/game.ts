import type { GameStateDto } from '@thelever-app/protocol';

/** Ana is the player using the screen and hosts it; the first of three dilemmas of two options, in its decision. */
export function aGame(overrides: Partial<GameStateDto> = {}): GameStateDto {
  return {
    type: 'game-state',
    gameId: 'test-game-id',
    gameVersion: 1,
    roomVersion: 2,
    playerId: 'test-ana-id',
    code: 'K7M2Q',
    round: {
      position: 0,
      phase: 'decision',
      endsAt: '2026-11-09T10:01:00.000Z',
      revealedBy: null,
      movedOnBy: null,
    },
    hostId: 'test-ana-id',
    serverTime: '2026-11-09T10:00:00.000Z',
    answeredCount: 0,
    reveal: null,
    dilemmas: [1, 2, 3].map((n) => ({
      dilemmaId: `test-dilemma-${n}`,
      personInTheGap: null,
      text: `Texto del dilema ${n}`,
      options: [
        { optionId: `test-option-${n}a`, text: `Opción ${n}A` },
        { optionId: `test-option-${n}b`, text: `Opción ${n}B` },
      ],
    })),
    playersToPredict: [],
    players: [
      {
        playerId: 'test-ana-id',
        nickname: 'Ana',
        avatar: { face: 'face-01', color: 'teal' },
        answered: false,
        connected: true,
        left: false,
      },
      {
        playerId: 'test-luis-id',
        nickname: 'Luis',
        avatar: { face: 'face-02', color: 'rust' },
        answered: false,
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
