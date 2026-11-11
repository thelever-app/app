import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewHostNotice } from '../../src/game/new-host-notice.tsx';
import { DecisionPhase } from '../../src/phases/decision-phase.tsx';
import { RoomContent } from '../../src/screens/room-screen.tsx';
import { soundPreference } from '../../src/sound/sound-preference.ts';
import { aGame } from '../support/game.ts';
import { fakeConnection } from '../support/fake-connection.ts';
import { renderWithProviders } from '../support/render.tsx';

/** The whole room, so what the menu opens can outlive the screen of a phase. */
async function renderRoom(game = aGame()) {
  const fake = fakeConnection();
  const rendered = await renderWithProviders(<RoomContent />, { connection: fake.connection });
  act(() => fake.deliver(game));
  return { ...fake, ...rendered };
}

async function renderPhase(game = aGame()) {
  const fake = fakeConnection();
  const rendered = await renderWithProviders(
    <>
      <DecisionPhase onShowQr={() => {}} />
      <NewHostNotice />
    </>,
    { connection: fake.connection },
  );
  act(() => fake.deliver(game));
  return { ...fake, ...rendered };
}

describe('the menu of the game', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('should turn the sound of the game off and on, vibration included, and remember it on the device', async () => {
    // Arrange
    const { t } = await renderPhase();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));
    const sound = screen.getByRole('switch', { name: t('sound.label') });
    const hint = sound.getAttribute('aria-describedby');
    const before = sound.getAttribute('aria-checked');

    // Act
    fireEvent.click(sound);

    // Assert
    expect(before).toBe('true');
    expect(sound.getAttribute('aria-checked')).toBe('false');
    expect(soundPreference().isMuted()).toBe(true);
    expect(hint && document.getElementById(hint)?.textContent).toBe(t('sound.hint'));
  });

  it('should let the player report the dilemma and, as offensive, skip it and wait for the others', async () => {
    // Arrange
    const { connection, deliver, t } = await renderPhase();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.report') }));
    fireEvent.click(screen.getByRole('radio', { name: t('report.reasons.offensive') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('report.send') }));
    fireEvent.click(screen.getByRole('button', { name: t('reportSent.skip') }));
    act(() =>
      deliver(
        aGame({
          gameVersion: 2,
          reports: [{ dilemmaId: 'test-dilemma-1', offensive: true }],
          didNotVote: [{ dilemmaId: 'test-dilemma-1', reason: 'reported' }],
        }),
      ),
    );

    // Assert
    expect(connection.send).toHaveBeenCalledWith({
      type: 'report-dilemma',
      dilemmaId: 'test-dilemma-1',
      reason: 'offensive',
    });
    expect(connection.send).toHaveBeenLastCalledWith({
      type: 'skip-dilemma',
      dilemmaId: 'test-dilemma-1',
    });
    expect(screen.getByRole('heading', { name: t('waiting.title') })).toBeDefined();
    expect(screen.queryByRole('button', { name: t('waiting.change') })).toBeNull();
  });

  it('should share the invitation link of the room during the game, with its code under it', async () => {
    // Arrange
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
    const { t } = await renderPhase();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));
    const share = screen.getByRole('button', { name: t('gameMenu.share') });

    // Act
    fireEvent.click(share);

    // Assert
    await screen.findByRole('button', { name: t('gameMenu.copied') });
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join/K7M2Q`);
    expect(share.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText(t('gameMenu.code', { code: 'K7M2Q' }))).toBeDefined();
  });

  it('should leave the share as it was when the browser does not let it copy the link', async () => {
    // Arrange
    const writeText = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
    const { t } = await renderPhase();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.share') }));

    // Assert
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: t('gameMenu.share') })).toBeDefined();
    expect(screen.getByText(t('gameMenu.code', { code: 'K7M2Q' }))).toBeDefined();
  });

  it('should show at full screen, during the game, the QR that leads to the room', async () => {
    // Arrange
    const { t } = await renderRoom();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.showQr') }));

    // Assert
    const qr = await screen.findByRole('img', { name: t('qr.label', { code: 'K7M2Q' }) });
    expect(qr.dataset.link).toBe(`${window.location.origin}/join/K7M2Q`);
    expect(screen.queryByRole('dialog', { name: t('gameMenu.title') })).toBeNull();
  });

  it('should keep the QR on screen when the round goes on to its reveal', async () => {
    // Arrange
    const { t, deliver } = await renderRoom();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.showQr') }));

    // Act
    act(() =>
      deliver(
        aGame({
          gameVersion: 2,
          round: { ...aGame().round, phase: 'reveal', revealedBy: 'time' },
          reveal: {
            position: 0,
            dilemmaId: 'test-dilemma-1',
            distribution: [
              { optionId: 'test-option-1a', count: 0 },
              { optionId: 'test-option-1b', count: 0 },
            ],
            tooFewVotes: false,
            voteCount: 0,
            didNotVoteCount: 2,
            votes: [],
            votePredictions: [],
            personInTheGap: null,
            addedBy: null,
          },
        }),
      ),
    );

    // Assert
    expect(screen.getByRole('img', { name: t('qr.label', { code: 'K7M2Q' }) })).toBeDefined();
  });

  it('should not offer to skip a dilemma reported for another reason', async () => {
    // Arrange
    const { t } = await renderPhase();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.report') }));
    fireEvent.click(screen.getByRole('radio', { name: t('report.reasons.confusing') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('report.send') }));

    // Assert
    expect(screen.getByRole('status').textContent).toContain(t('reportSent.thanks'));
    expect(screen.queryByRole('button', { name: t('reportSent.skip') })).toBeNull();
  });

  it('should let only the host reveal the dilemma early, after confirming it', async () => {
    // Arrange
    const { connection, t } = await renderPhase();
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.revealEarly') }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('revealEarly.reveal') }));

    // Assert
    expect(connection.send).toHaveBeenLastCalledWith({ type: 'reveal-early' });
  });

  it('should not offer to reveal early to a guest', async () => {
    // Arrange
    const { t } = await renderPhase(aGame({ hostId: 'test-luis-id' }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('gameMenu.open') }));

    // Assert
    expect(screen.queryByRole('button', { name: t('gameMenu.revealEarly') })).toBeNull();
    expect(screen.getByRole('button', { name: t('gameMenu.leave') })).toBeDefined();
  });

  it('should tell the player who becomes the host, and why', async () => {
    // Arrange
    const game = aGame({ hostId: 'test-luis-id' });
    const { deliver, t } = await renderPhase(game);
    const luisLeft = game.players.map((player) =>
      player.nickname === 'Luis' ? { ...player, left: true } : player,
    );

    // Act
    act(() => deliver(aGame({ hostId: 'test-ana-id', gameVersion: 2, players: luisLeft })));

    // Assert
    const notice = screen.getByRole('status').textContent;
    expect(notice).toContain(t('newHost.title'));
    expect(notice).toContain(t('newHost.left', { host: 'Luis' }));
  });
});
