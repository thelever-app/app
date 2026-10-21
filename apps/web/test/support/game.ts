import type { GameStateDto } from '@thelever-app/protocol';

/** Ana is the player using the screen; three dilemmas of two options each. */
export function aGame(overrides: Partial<GameStateDto> = {}): GameStateDto {
  return {
    type: 'game-state',
    gameId: 'test-game-id',
    playerId: 'test-ana-id',
    dilemmas: [1, 2, 3].map((n) => ({
      dilemmaId: `test-dilemma-${n}`,
      text: `Texto del dilema ${n}`,
      options: [
        { optionId: `test-option-${n}a`, text: `Opción ${n}A` },
        { optionId: `test-option-${n}b`, text: `Opción ${n}B` },
      ],
    })),
    players: [
      { playerId: 'test-ana-id', nickname: 'Ana', progress: 0 },
      { playerId: 'test-luis-id', nickname: 'Luis', progress: 1 },
    ],
    answers: [],
    ...overrides,
  };
}
