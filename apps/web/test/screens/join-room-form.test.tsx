import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { AvatarDto } from '@thelever-app/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lastNickname } from '../../src/identity/last-nickname.ts';
import { RoomApiError } from '../../src/room/room-api.ts';
import { JoinRoomForm } from '../../src/screens/join-room-form.tsx';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const JOINED = { playerId: 'test-luis-id' };

const ANA_AVATAR: AvatarDto = { face: 'face-01', color: 'teal' };
const SUGGESTED: AvatarDto = { face: 'face-05', color: 'cyan' };

/** Ana is inside, and the room suggests an avatar nobody has. */
const INSIDE = [{ nickname: 'Ana', avatar: ANA_AVATAR }];

type JoinRoom = (roomId: string, nickname: string, avatar: AvatarDto) => Promise<typeof JOINED>;

async function renderForm(joinRoom: JoinRoom, suggestedAvatar = SUGGESTED) {
  const api = fakeRoomApi({ joinRoom: vi.fn(joinRoom) });
  const onRefused = vi.fn();
  const rendered = await renderAtRoute(
    <JoinRoomForm
      roomId="test-room-id"
      players={INSIDE}
      suggestedAvatar={suggestedAvatar}
      onRefused={onRefused}
    />,
    { api, at: '/join/K7M2Q' },
  );
  const { t } = rendered;
  const type = (nickname: string) =>
    fireEvent.change(screen.getByRole('textbox', { name: t('joinRoom.nickname') }), {
      target: { value: nickname },
    });
  const join = (nickname: string) => {
    type(nickname);
    fireEvent.click(screen.getByRole('button', { name: t('joinRoom.submit') }));
  };
  const openPicker = () =>
    fireEvent.click(screen.getByRole('button', { name: t('avatarPicker.change') }));
  return { ...rendered, api, onRefused, type, join, openPicker };
}

/** The avatar the form shows, as its button tells it. */
function shownAvatar() {
  const button = document.querySelector<HTMLElement>('button[data-face]');
  return { face: button?.dataset.face, color: button?.dataset.color };
}

function submitButton(): HTMLElement {
  const button = document.querySelector<HTMLElement>('button[type="submit"]');
  if (!button) throw new Error('The form has no submit button');
  return button;
}

describe('JoinRoomForm', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should start with the nickname the device last played with and the avatar the room suggests', async () => {
    // Arrange
    localStorage.setItem('thelever.lastNickname', 'Luis');

    // Act
    const { t } = await renderForm(async () => JOINED);

    // Assert
    expect(screen.getByRole('textbox', { name: t('joinRoom.nickname') })).toHaveProperty(
      'value',
      'Luis',
    );
    expect(shownAvatar()).toEqual(SUGGESTED);
  });

  it('should join the room with the nickname and the avatar, remember the nickname and enter it', async () => {
    // Arrange
    const { api, join, location } = await renderForm(async () => JOINED);

    // Act
    join('Luis');

    // Assert
    await waitFor(() => expect(location()).toBe('/rooms/test-room-id'));
    expect(api.joinRoom).toHaveBeenCalledWith('test-room-id', 'Luis', SUGGESTED);
    expect(lastNickname()).toBe('Luis');
  });

  it('should join with another avatar the player chose, even one that someone else has', async () => {
    // Arrange
    const { t, api, type, openPicker } = await renderForm(async () => JOINED);
    type('Luis');
    openPicker();
    const picker = screen.getByRole('dialog');

    // Act: Ana has the first face in teal.
    fireEvent.click(within(picker).getByRole('button', { name: t('avatarPicker.colors.teal') }));
    fireEvent.click(
      within(picker).getByRole('button', { name: t('avatarPicker.face', { number: 1 }) }),
    );
    fireEvent.click(within(picker).getByRole('button', { name: t('avatarPicker.use') }));
    fireEvent.click(screen.getByRole('button', { name: t('joinRoom.submit') }));

    // Assert
    await waitFor(() =>
      expect(api.joinRoom).toHaveBeenCalledWith('test-room-id', 'Luis', ANA_AVATAR),
    );
  });

  it('should tell the player, softly, that someone with the same nickname is inside', async () => {
    // Arrange
    const { t, type } = await renderForm(async () => JOINED);

    // Act
    type('aná');

    // Assert
    expect(screen.getByTestId('namesake').textContent).toBe(
      t('joinRoom.namesake', { nickname: 'Ana' }),
    );
    expect(screen.getByRole('button', { name: t('joinRoom.submit') })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('should leave out of the picker the avatar of whoever has the same nickname', async () => {
    // Arrange
    const { t, type, openPicker } = await renderForm(async () => JOINED);
    type('Ana');

    // Act
    openPicker();
    const picker = screen.getByRole('dialog');
    fireEvent.click(within(picker).getByRole('button', { name: t('avatarPicker.colors.teal') }));

    // Assert
    const anas = within(picker).getByRole('button', {
      name: t('avatarPicker.face', { number: 1 }),
    });
    expect(anas).toHaveProperty('disabled', true);
    expect(within(picker).getByText(t('avatarPicker.hint'))).toBeDefined();
  });

  it('should not let the player in, and ask for another avatar, if the nickname makes it one of a namesake', async () => {
    // Arrange: the room suggests the avatar Ana has, as it would after she changed to it.
    const { t, type } = await renderForm(async () => JOINED, ANA_AVATAR);

    // Act
    type('ANA');

    // Assert
    expect(submitButton().textContent).toBe(t('joinRoom.missingAvatar'));
    expect(submitButton()).toHaveProperty('disabled', true);
  });

  it('should ask for another avatar when someone with the same nickname got in with it meanwhile', async () => {
    // Arrange
    const { t, join } = await renderForm(async () => {
      throw new RoomApiError('nickname-and-avatar-taken');
    });

    // Act
    join('Luis');

    // Assert
    const picker = await screen.findByRole('dialog');
    const suggested = within(picker).getByRole('button', {
      name: t('avatarPicker.face', { number: 5 }),
    });
    expect(suggested).toHaveProperty('disabled', true);
    // The picker hides the rest of the screen from assistive technology until it closes.
    await waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toBe(
        t('joinRoom.lookalikeJustJoined', { nickname: 'Luis' }),
      ),
    );
  });

  it.each(['room-full', 'player-expelled', 'room-not-found'] as const)(
    'should hand %s over to the screen, which explains it, and not let them in',
    async (code) => {
      // Arrange
      const { join, onRefused, location } = await renderForm(async () => {
        throw new RoomApiError(code);
      });

      // Act
      join('Luis');

      // Assert
      await waitFor(() => expect(onRefused).toHaveBeenCalledWith(code));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(location()).toBe('/join/K7M2Q');
    },
  );

  it('should not let the player in, and ask for the nickname, until they write one', async () => {
    // Arrange
    const { t, type } = await renderForm(async () => JOINED);

    // Act
    type('   ');
    const whileBlank = {
      name: submitButton().textContent,
      disabled: submitButton().hasAttribute('disabled'),
    };
    type('Luis');

    // Assert
    expect(whileBlank).toEqual({ name: t('joinRoom.missingNickname'), disabled: true });
    expect(screen.getByRole('button', { name: t('joinRoom.submit') })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('should say why next to the field when the room server says no for another reason', async () => {
    // Arrange
    const { join, t } = await renderForm(async () => {
      throw new TypeError('Failed to fetch');
    });

    // Act
    join('Luis');

    // Assert
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', t('roomErrors.unknown'));
    expect(screen.getByRole('textbox', { name: t('joinRoom.nickname') })).toHaveProperty(
      'value',
      'Luis',
    );
  });
});
