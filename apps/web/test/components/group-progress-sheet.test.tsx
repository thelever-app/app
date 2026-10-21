import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GroupProgressSheet } from '../../src/components/group-progress-sheet.tsx';
import { renderWithProviders } from '../support/render.tsx';
import { aGame } from '../support/game.ts';

async function renderSheet() {
  const { players, dilemmas, playerId } = aGame();
  const result = await renderWithProviders(
    <GroupProgressSheet players={players} dilemmaCount={dilemmas.length} selfPlayerId={playerId} />,
  );
  const trigger = screen.getByRole('button', { name: result.t('progressStrip.showAll') });
  return { ...result, trigger };
}

describe('GroupProgressSheet', () => {
  it('should be closed until the player asks to see the whole group', async () => {
    // Act
    await renderSheet();

    // Assert
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should open a dialog with the title of the group that lists every player', async () => {
    // Arrange
    const { t, trigger } = await renderSheet();

    // Act
    fireEvent.click(trigger);

    // Assert
    const dialog = screen.getByRole('dialog', { name: t('groupSheet.title') });
    const description = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toBe(t('groupSheet.summary', { count: 2 }));
    expect(
      within(dialog).getByRole('region', { name: t('playerList.pending', { count: 2 }) }),
    ).toBeDefined();
  });

  it('should move the focus into the dialog when it opens', async () => {
    // Arrange
    const { trigger } = await renderSheet();

    // Act
    fireEvent.click(trigger);

    // Assert
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('should close with the close button', async () => {
    // Arrange
    const { t, trigger } = await renderSheet();
    fireEvent.click(trigger);

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('groupSheet.close') }));

    // Assert
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should close with Escape and give the focus back to the button that opened it', async () => {
    // Arrange
    const { trigger } = await renderSheet();
    trigger.focus();
    fireEvent.click(trigger);

    // Act
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });

    // Assert
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
