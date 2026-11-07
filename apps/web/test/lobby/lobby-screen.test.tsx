import type { RoomStateDto } from '@thelever-app/protocol';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from '../../src/i18n/i18n.ts';
import { LobbyScreen } from '../../src/lobby/lobby-screen.tsx';
import type { RoomApi } from '../../src/room/room-api.ts';
import { RoomApiProvider } from '../../src/room/room-api-context.tsx';
import { RoomProvider } from '../../src/room/room-provider.tsx';
import { fakeConnection } from '../support/fake-connection.ts';
import { aRoom } from '../support/room.ts';
import { fakeRoomApi } from '../support/routing.tsx';

const FOUND: Awaited<ReturnType<RoomApi['searchDilemmas']>> = [
  {
    dilemmaId: 'test-dilemma-1',
    text: 'TestText1',
    minimumAge: 16,
    category: 'honesty',
    tags: ['family'],
  },
  { dilemmaId: 'test-dilemma-2', text: 'TestText2', minimumAge: 16, category: 'honesty', tags: [] },
];

/** Luis is the one using the screen in the lobby of Ana. */
const AS_LUIS = { playerId: 'test-luis-id' };

/** The lobby of the room as the screen of one of its players gets it. */
async function renderLobby(room: RoomStateDto = aRoom(), api: RoomApi = fakeRoomApi()) {
  const i18n = await createI18n('es');
  const fake = fakeConnection();
  render(
    <I18nextProvider i18n={i18n}>
      <RoomApiProvider api={api}>
        <MemoryRouter>
          <RoomProvider connection={fake.connection} fallback={null} rejected={() => null}>
            <LobbyScreen />
          </RoomProvider>
        </MemoryRouter>
      </RoomApiProvider>
    </I18nextProvider>,
  );
  act(() => fake.deliver(room));
  return { t: i18n.t, send: fake.connection.send, deliver: fake.deliver };
}

describe('LobbyScreen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('what everyone sees', () => {
    it('should show the code to invite with and who is in the room, the host marked', async () => {
      // Act
      const { t } = await renderLobby();

      // Assert
      expect(screen.getByLabelText('K 7 M 2 Q')).toBeDefined();
      const players = screen.getByRole('region', { name: t('lobby.players', { count: 3 }) });
      const rows = within(players).getAllByRole('listitem');
      expect(rows.map((row) => row.textContent)).toEqual([
        `${t('lobby.you', { name: 'Ana' })}${t('lobby.host')}`,
        'Luis',
        'Marta',
      ]);
    });

    it('should sum up the configuration and the kind of room', async () => {
      // Act
      const { t } = await renderLobby(
        aRoom({ settings: { ...aRoom().settings, variant: 'anonymous' } }),
      );

      // Assert
      expect(screen.getByText(t('variant.anonymous.name'))).toBeDefined();
      expect(screen.getByTestId('room-settings').textContent).toBe(
        '8 dilemas · 6 min · Español · Amigos',
      );
    });

    it('should advise a video call to a group that plays remotely', async () => {
      // Act
      const { t } = await renderLobby(aRoom({ place: 'remote' }));

      // Assert
      expect(screen.getByRole('note').textContent).toBe(t('lobby.remote'));
    });

    it('should copy the invitation link where the device cannot share it', async () => {
      // Arrange
      const writeText = vi.fn(async () => {});
      vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } });
      const { t } = await renderLobby();

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('lobby.share') }));

      // Assert
      await screen.findByRole('button', { name: t('lobby.copied') });
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join/K7M2Q`);
    });

    it('should show at full screen a QR that leads to the room', async () => {
      // Arrange
      const { t } = await renderLobby();

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('lobby.showQr') }));

      // Assert
      const qr = screen.getByRole('img', { name: t('qr.label', { code: 'K7M2Q' }) });
      expect(qr.dataset.link).toBe(`${window.location.origin}/join/K7M2Q`);
    });
  });

  describe('the host', () => {
    it('should start the game once the room has the players it needs', async () => {
      // Arrange
      const { t, send } = await renderLobby();

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('lobby.start') }));

      // Assert
      expect(send).toHaveBeenCalledWith({ type: 'start-game' });
    });

    it('should say how many players are missing, as the room says it needs', async () => {
      // Act
      const { t } = await renderLobby(aRoom({ minimumPlayers: 5 }));

      // Assert
      const start = screen.getByRole('button', { name: t('lobby.missing', { count: 2 }) });
      expect(start).toHaveProperty('disabled', true);
    });

    it('should send only what changed in the configuration', async () => {
      // Arrange
      const { t, send } = await renderLobby();
      fireEvent.click(screen.getByRole('button', { name: t('lobby.change') }));

      // Act
      fireEvent.click(screen.getByRole('radio', { name: t('settings.anonymous') }));
      fireEvent.click(
        screen.getByRole('switch', { name: new RegExp(t('settings.adultsOnly.label')) }),
      );
      fireEvent.click(screen.getByRole('button', { name: t('settings.save') }));

      // Assert
      expect(send).toHaveBeenCalledWith({
        type: 'change-settings',
        changes: { variant: 'anonymous', adultsOnly: true },
      });
    });

    it('should send nothing when the configuration did not change', async () => {
      // Arrange
      const { t, send } = await renderLobby();
      fireEvent.click(screen.getByRole('button', { name: t('lobby.change') }));

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('settings.save') }));

      // Assert
      expect(send).not.toHaveBeenCalled();
    });

    it('should pick the dilemmas it finds by tag', async () => {
      // Arrange
      const searchDilemmas = vi.fn(async () => [...FOUND]);
      const { t, send } = await renderLobby(aRoom(), fakeRoomApi({ searchDilemmas }));
      fireEvent.click(screen.getByRole('button', { name: t('lobby.change') }));
      fireEvent.click(screen.getByRole('button', { name: t('settings.pick') }));

      // Act
      fireEvent.change(screen.getByRole('searchbox', { name: t('pickDilemmas.search') }), {
        target: { value: '#Family' },
      });
      fireEvent.click(await screen.findByRole('checkbox', { name: /TestText1/ }));
      fireEvent.click(screen.getByRole('button', { name: t('pickDilemmas.play', { count: 1 }) }));

      // Assert
      await waitFor(() =>
        expect(searchDilemmas).toHaveBeenLastCalledWith('test-room-id', { tags: ['family'] }),
      );
      expect(send).toHaveBeenCalledWith({ type: 'pick-dilemmas', dilemmaIds: ['test-dilemma-1'] });
    });

    it('should expel a player after confirming it', async () => {
      // Arrange
      const { t, send } = await renderLobby();
      fireEvent.click(screen.getByRole('button', { name: t('lobby.toExpel', { name: 'Marta' }) }));

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('expel.confirm') }));

      // Assert
      expect(send).toHaveBeenCalledWith({ type: 'expel-player', playerId: 'test-marta-id' });
    });

    it('should see the dilemmas the players added, without who, and remove one', async () => {
      // Arrange
      const { t, send } = await renderLobby(
        aRoom({
          settings: { ...aRoom().settings, playersCanAddDilemmas: true },
          addedDilemmas: [{ dilemmaId: 'test-dilemma-1', text: 'TestText1' }],
        }),
      );
      const added = screen.getByRole('region', {
        name: t('lobby.added.title', { count: 1, total: 8 }),
      });

      // Act
      fireEvent.click(within(added).getByRole('button', { name: t('lobby.added.remove') }));

      // Assert
      expect(added.textContent).not.toMatch(/Luis|Marta/);
      expect(send).toHaveBeenCalledWith({
        type: 'remove-added-dilemma',
        dilemmaId: 'test-dilemma-1',
      });
    });
  });

  describe('another player', () => {
    it('should see the configuration without any way to change it, nor to start or expel', async () => {
      // Act
      const { t } = await renderLobby(aRoom(AS_LUIS));

      // Assert
      expect(screen.queryByRole('button', { name: t('lobby.change') })).toBeNull();
      expect(screen.queryByRole('button', { name: t('lobby.start') })).toBeNull();
      expect(screen.queryByRole('button', { name: /expulsar/ })).toBeNull();
      expect(screen.getByText(t('lobby.guestWait', { host: 'Ana' }))).toBeDefined();
    });

    it('should add a dilemma of the catalog when the host allows it', async () => {
      // Arrange
      const searchDilemmas = vi.fn(async () => [...FOUND]);
      const room = aRoom({
        ...AS_LUIS,
        settings: { ...aRoom().settings, playersCanAddDilemmas: true },
      });
      const { t, send } = await renderLobby(room, fakeRoomApi({ searchDilemmas }));

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('lobby.add.action') }));
      fireEvent.click(await screen.findByRole('button', { name: /TestText2/ }));

      // Assert
      expect(send).toHaveBeenCalledWith({ type: 'add-dilemma', dilemmaId: 'test-dilemma-2' });
    });

    it('should see the dilemma they added, and no way to add another', async () => {
      // Act
      const { t } = await renderLobby(
        aRoom({
          ...AS_LUIS,
          settings: { ...aRoom().settings, playersCanAddDilemmas: true },
          addedDilemmas: [{ dilemmaId: 'test-dilemma-1', text: 'TestText1' }],
          ownAddedDilemmaId: 'test-dilemma-1',
        }),
      );

      // Assert
      expect(screen.getByText('TestText1')).toBeDefined();
      expect(screen.queryByRole('button', { name: t('lobby.add.action') })).toBeNull();
    });

    it('should take an avatar nobody else in the room has', async () => {
      // Arrange
      const { t, send } = await renderLobby(aRoom(AS_LUIS));
      fireEvent.click(
        screen.getByRole('button', { name: t('lobby.toChangeAvatar', { name: 'Luis' }) }),
      );

      // Act: Ana has the first face in teal.
      fireEvent.click(screen.getByRole('button', { name: t('avatarPicker.colors.teal') }));
      const taken = screen.getByRole('button', { name: t('avatarPicker.face', { number: 1 }) });
      fireEvent.click(screen.getByRole('button', { name: t('avatarPicker.face', { number: 4 }) }));
      fireEvent.click(screen.getByRole('button', { name: t('avatarPicker.use') }));

      // Assert
      expect(taken).toHaveProperty('disabled', true);
      expect(send).toHaveBeenCalledWith({ type: 'change-avatar', face: 'face-04', color: 'teal' });
    });
  });
});
