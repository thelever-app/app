import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressStrip } from '../../src/components/progress-strip.tsx';
import { renderWithProviders } from '../support/render.tsx';

const PLAYERS = ['Luis', 'Ana', 'Marta', 'Pablo', 'Sara', 'Nico'].map((nickname, index) => ({
  playerId: `test-${nickname.toLowerCase()}-id`,
  nickname,
  progress: index,
}));

function renderStrip() {
  return renderWithProviders(
    <ProgressStrip position={1} players={PLAYERS} dilemmaCount={6} selfPlayerId="test-ana-id" />,
  );
}

describe('ProgressStrip', () => {
  it('should say which dilemma is on screen', async () => {
    // Act
    const { t } = await renderStrip();

    // Assert
    expect(screen.getByText(t('progressStrip.position', { position: 2, total: 6 }))).toBeDefined();
  });

  it('should show the player first and four players at most, and how many more there are', async () => {
    // Act
    const { t } = await renderStrip();

    // Assert
    const count = (progress: number) => t('playerList.progressCount', { progress, total: 6 });
    const group = screen.getByRole('region', { name: t('progressStrip.group') });
    expect(
      within(group)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      `${t('playerList.you')} ${count(1)}`,
      `Luis ${count(0)}`,
      `Marta ${count(2)}`,
      `Pablo ${count(3)}`,
    ]);
    expect(within(group).getByText(t('progressStrip.more', { count: 2 }))).toBeDefined();
  });

  it('should offer to see the whole group', async () => {
    // Act
    const { t } = await renderStrip();

    // Assert
    expect(screen.getByRole('button', { name: t('progressStrip.showAll') })).toBeDefined();
  });
});
