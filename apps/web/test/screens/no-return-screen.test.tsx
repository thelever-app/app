import type { ErrorCodeDto } from '@thelever-app/protocol';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NoReturnScreen } from '../../src/screens/no-return-screen.tsx';
import { renderWithProviders } from '../support/render.tsx';

async function renderNoReturn(code: ErrorCodeDto | undefined) {
  const onReload = vi.fn();
  const { t } = await renderWithProviders(<NoReturnScreen code={code} onReload={onReload} />);
  return { onReload, t };
}

describe('NoReturnScreen', () => {
  it.each([
    ['game-not-found', 'gone'],
    ['player-not-in-game', 'device'],
  ] as const)('should explain %s with nothing to do but ask the group', async (code, variant) => {
    // Act
    const { t } = await renderNoReturn(code);

    // Assert
    expect(screen.getByRole('heading', { name: t(`noReturn.${variant}.title`) })).toBeDefined();
    expect(screen.getByText(t(`noReturn.${variant}.text`))).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each([
    ['unsupported-contract-version', 'update'],
    ['invalid-token', 'identity'],
    ['invalid-message', 'identity'],
    [undefined, 'identity'],
  ] as const)('should offer to reload for %s', async (code, variant) => {
    // Arrange
    const { onReload, t } = await renderNoReturn(code);
    expect(screen.getByRole('heading', { name: t(`noReturn.${variant}.title`) })).toBeDefined();

    // Act
    fireEvent.click(screen.getByRole('button', { name: t(`noReturn.${variant}.action`) }));

    // Assert
    expect(onReload).toHaveBeenCalledOnce();
  });
});
