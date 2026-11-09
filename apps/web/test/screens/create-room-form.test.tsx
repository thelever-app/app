import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { CreateRoomRequestDto } from '@thelever-app/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lastNickname } from '../../src/identity/last-nickname.ts';
import { RoomApiError } from '../../src/room/room-api.ts';
import { CreateRoomForm } from '../../src/screens/create-room-form.tsx';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const CREATED = { roomId: 'test-room-id', code: 'K7M2Q', playerId: 'test-ana-id' };

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

async function renderForm(createRoom: (request: CreateRoomRequestDto) => Promise<typeof CREATED>) {
  const api = fakeRoomApi({ createRoom: vi.fn(createRoom) });
  const rendered = await renderAtRoute(<CreateRoomForm />, { api });
  const { t } = rendered;
  const fill = ({ nickname = 'Ana', nature = 'friends', place = 'remote' } = {}) => {
    fireEvent.change(screen.getByRole('textbox', { name: t('createRoom.nickname') }), {
      target: { value: nickname },
    });
    fireEvent.click(
      screen.getByRole('radio', { name: t(`createRoom.groupNature.${nature as 'friends'}`) }),
    );
    fireEvent.click(
      screen.getByRole('radio', { name: t(`createRoom.place.${place as 'remote'}`) }),
    );
  };
  const submit = () =>
    fireEvent.click(screen.getByRole('button', { name: t('createRoom.submit') }));
  return { ...rendered, api, fill, submit };
}

describe('CreateRoomForm', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should start with the nickname the device last played with', async () => {
    // Arrange
    localStorage.setItem('thelever.lastNickname', 'Ana');

    // Act
    const { t } = await renderForm(async () => CREATED);

    // Assert
    expect(screen.getByRole('textbox', { name: t('createRoom.nickname') })).toHaveProperty(
      'value',
      'Ana',
    );
  });

  it('should ask for the nickname, the nature of the group and the place, with one choice each', async () => {
    // Act
    const { t } = await renderForm(async () => CREATED);

    // Assert
    expect(screen.getByRole('textbox', { name: t('createRoom.nickname') })).toHaveProperty(
      'required',
      true,
    );
    const natures = screen.getByRole('group', { name: t('createRoom.groupNature.label') });
    const places = screen.getByRole('group', { name: t('createRoom.place.label') });
    for (const group of [natures, places]) {
      const radios = [...group.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
      expect(new Set(radios.map(({ name }) => name)).size).toBe(1);
      expect(radios.some(({ required }) => required)).toBe(true);
      expect(radios.some(({ checked }) => checked)).toBe(false);
    }
  });

  it('should create the room in the language of the device, remember the nickname and enter it', async () => {
    // Arrange
    const { api, fill, submit, location } = await renderForm(async () => CREATED);
    fill({ nickname: ' Ana ' });

    // Act
    submit();

    // Assert
    await waitFor(() => expect(location()).toBe('/rooms/test-room-id'));
    expect(api.createRoom).toHaveBeenCalledWith({
      nickname: ' Ana ',
      avatar: shownAvatar(),
      groupNature: 'friends',
      place: 'remote',
      dilemmaLanguage: 'es',
    });
    expect(lastNickname()).toBe('Ana');
  });

  it('should create the room with the avatar the host chose instead of the random one', async () => {
    // Arrange
    const { t, api, fill, submit } = await renderForm(async () => CREATED);
    fill();
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`^${t('avatarPicker.change')}`) }),
    );
    const picker = screen.getByRole('dialog');

    // Act
    fireEvent.click(within(picker).getByRole('button', { name: t('avatarPicker.colors.olive') }));
    fireEvent.click(
      within(picker).getByRole('button', { name: t('avatarPicker.face', { number: 7 }) }),
    );
    fireEvent.click(within(picker).getByRole('button', { name: t('avatarPicker.use') }));
    submit();

    // Assert
    await waitFor(() => expect(api.createRoom).toHaveBeenCalled());
    expect(api.createRoom).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: { face: 'face-07', color: 'olive' } }),
    );
  });

  it('should not let the room be created, and say what is missing, until everything is chosen', async () => {
    // Arrange
    const { t } = await renderForm(async () => CREATED);
    const button = () => submitButton();
    const missing: string[] = [];

    // Act
    fireEvent.change(screen.getByRole('textbox', { name: t('createRoom.nickname') }), {
      target: { value: '   ' },
    });
    missing.push(button().textContent);
    fireEvent.change(screen.getByRole('textbox', { name: t('createRoom.nickname') }), {
      target: { value: 'Ana' },
    });
    missing.push(button().textContent);
    fireEvent.click(screen.getByRole('radio', { name: t('createRoom.groupNature.friends') }));
    missing.push(button().textContent);
    const disabledUntilTheEnd = button().hasAttribute('disabled');
    fireEvent.click(screen.getByRole('radio', { name: t('createRoom.place.remote') }));

    // Assert
    expect(missing).toEqual([
      t('createRoom.missing.nickname'),
      t('createRoom.missing.groupNature'),
      t('createRoom.missing.place'),
    ]);
    expect(disabledUntilTheEnd).toBe(true);
    expect(screen.getByRole('button', { name: t('createRoom.submit') })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('should say why the room server said no, and keep what the player chose', async () => {
    // Arrange
    const { fill, submit, t, location } = await renderForm(async () => {
      throw new RoomApiError('dilemmas-missing');
    });
    fill({ nickname: 'Ana', nature: 'family', place: 'together' });

    // Act
    submit();

    // Assert
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      t('roomErrors.dilemmas-missing'),
    );
    expect(screen.getByRole('textbox', { name: t('createRoom.nickname') })).toHaveProperty(
      'value',
      'Ana',
    );
    expect(screen.getByRole('radio', { name: t('createRoom.groupNature.family') })).toHaveProperty(
      'checked',
      true,
    );
    expect(screen.getByRole('radio', { name: t('createRoom.place.together') })).toHaveProperty(
      'checked',
      true,
    );
    expect(location()).toBe('/');
    expect(lastNickname()).toBe('');
  });

  it('should say it did not go well when the room server does not say why', async () => {
    // Arrange
    const { fill, submit, t } = await renderForm(async () => {
      throw new TypeError('Failed to fetch');
    });
    fill();

    // Act
    submit();

    // Assert
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', t('roomErrors.unknown'));
  });
});
