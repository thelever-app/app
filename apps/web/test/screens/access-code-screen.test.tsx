import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import type { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vitest';
import { RoomApiError } from '../../src/room/room-api.ts';
import { CreateRoomForm } from '../../src/screens/create-room-form.tsx';
import { JoinScreen } from '../../src/screens/join-screen.tsx';
import { useAccessGate } from '../../src/screens/use-access-gate.tsx';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

/** Test data: the access code of the environment. */
const ACCESS_CODE = 'palanca';

const CREATED = { roomId: 'test-room-id', code: 'K7M2Q', playerId: 'test-ana-id' };

const PREVIEW = {
  roomId: 'test-room-id',
  hostNickname: 'Ana',
  variant: 'anonymous' as const,
  adultsOnly: false,
  players: [{ nickname: 'Ana', avatar: { face: 'face-01' as const, color: 'teal' as const } }],
  suggestedAvatar: { face: 'face-05' as const, color: 'cyan' as const },
};

/**
 * Routes of a closed environment: a call goes through only once the player entered the code,
 * as the room server would let it.
 */
function closedRoomApi<T>(answer: () => T) {
  let entered: string | undefined;
  const call = vi.fn(async () => {
    if (entered !== ACCESS_CODE) throw new RoomApiError('invalid-access-code');
    return answer();
  });
  const enterAccessCode = vi.fn((code: string) => {
    entered = code;
  });
  return { call, enterAccessCode };
}

function enterCode(t: TFunction, code: string) {
  fireEvent.change(screen.getByRole('textbox', { name: t('accessCode.label') }), {
    target: { value: code },
  });
  fireEvent.click(screen.getByRole('button', { name: t('accessCode.enter') }));
}

async function renderCreateRoom() {
  const { call, enterAccessCode } = closedRoomApi(() => CREATED);
  const rendered = await renderAtRoute(<CreateRoomForm />, {
    api: fakeRoomApi({ createRoom: call, enterAccessCode }),
  });
  const { t } = rendered;
  fireEvent.change(screen.getByRole('textbox', { name: t('createRoom.nickname') }), {
    target: { value: 'Ana' },
  });
  fireEvent.click(screen.getByRole('radio', { name: t('createRoom.groupNature.friends') }));
  fireEvent.click(screen.getByRole('radio', { name: t('createRoom.place.remote') }));
  fireEvent.click(screen.getByRole('button', { name: t('createRoom.submit') }));
  return { ...rendered, createRoom: call, enterAccessCode };
}

describe('AccessCodeScreen', () => {
  it('should ask for the access code when the room server asks for it on creating a room', async () => {
    // Act
    const { t } = await renderCreateRoom();

    // Assert
    expect(await screen.findByRole('dialog', { name: t('accessCode.title') })).toBeDefined();
    expect(screen.getByText(t('accessCode.text'))).toBeDefined();
    expect(screen.getByRole('button', { name: t('accessCode.enter') })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('should create the room with the code once the player enters it', async () => {
    // Arrange
    const { t, location, createRoom, enterAccessCode } = await renderCreateRoom();
    await screen.findByRole('dialog', { name: t('accessCode.title') });

    // Act
    enterCode(t, ACCESS_CODE);

    // Assert
    await waitFor(() => expect(location()).toBe('/rooms/test-room-id'));
    expect(enterAccessCode).toHaveBeenCalledWith(ACCESS_CODE);
    expect(createRoom).toHaveBeenCalledTimes(2);
  });

  it('should tell the player the code is not valid, until they type again', async () => {
    // Arrange
    const { t } = await renderCreateRoom();
    await screen.findByRole('dialog', { name: t('accessCode.title') });

    // Act
    enterCode(t, 'another-code');

    // Assert
    expect(await screen.findByText(t('accessCode.invalid'))).toBeDefined();
    fireEvent.change(screen.getByRole('textbox', { name: t('accessCode.label') }), {
      target: { value: 'another-cod' },
    });
    expect(screen.queryByText(t('accessCode.invalid'))).toBeNull();
  });

  it('should take the player back to the form as they left it', async () => {
    // Arrange
    const { t, location } = await renderCreateRoom();
    await screen.findByRole('dialog', { name: t('accessCode.title') });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('home.back') }));

    // Assert
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(location()).toBe('/');
    expect(screen.getByRole('textbox', { name: t('createRoom.nickname') })).toHaveProperty(
      'value',
      'Ana',
    );
  });

  it('should keep the player waiting for the answer while the code is checked', async () => {
    // Arrange
    let entered = false;
    // The call with the code waits until the end of the test: an action left pending would hold
    // back the navigations of the next tests.
    let answer: () => void = () => undefined;
    const createRoom = vi.fn(async () => {
      if (!entered) throw new RoomApiError('invalid-access-code');
      return new Promise<typeof CREATED>((resolve) => {
        answer = () => resolve(CREATED);
      });
    });
    const { t } = await renderAtRoute(<CreateRoomForm />, {
      api: fakeRoomApi({
        createRoom,
        enterAccessCode: vi.fn(() => {
          entered = true;
        }),
      }),
    });
    fireEvent.change(screen.getByRole('textbox', { name: t('createRoom.nickname') }), {
      target: { value: 'Ana' },
    });
    fireEvent.click(screen.getByRole('radio', { name: t('createRoom.groupNature.friends') }));
    fireEvent.click(screen.getByRole('radio', { name: t('createRoom.place.remote') }));
    fireEvent.click(screen.getByRole('button', { name: t('createRoom.submit') }));
    await screen.findByRole('dialog', { name: t('accessCode.title') });

    // Act
    enterCode(t, ACCESS_CODE);

    // Assert
    expect(await screen.findByRole('button', { name: t('accessCode.entering') })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByRole('button', { name: t('home.back') })).toHaveProperty('disabled', true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: t('accessCode.title') })).toBeDefined();
    answer();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('should leave the screen to the call that replaced another while asking for the code', async () => {
    // Arrange
    const { call, enterAccessCode } = closedRoomApi(() => PREVIEW);
    /** Asks twice in a row, as an effect that runs again before its first call answered. */
    function TwoCalls() {
      const { withAccess, accessCodeScreen } = useAccessGate();
      const [host, setHost] = useState<string>();
      useEffect(() => {
        void withAccess(call);
        void withAccess(call).then((room) => setHost(room?.hostNickname));
      }, [withAccess]);
      return (
        <>
          <output data-testid="host">{host}</output>
          {accessCodeScreen}
        </>
      );
    }
    const { t } = await renderAtRoute(<TwoCalls />, {
      api: fakeRoomApi({ previewRoom: call, enterAccessCode }),
    });
    await screen.findByRole('dialog', { name: t('accessCode.title') });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Act
    enterCode(t, ACCESS_CODE);

    // Assert
    await waitFor(() => expect(screen.getByTestId('host').textContent).toBe('Ana'));
  });

  it('should ask whoever opens an invitation without the code for it before showing the room', async () => {
    // Arrange
    const { call, enterAccessCode } = closedRoomApi(() => PREVIEW);
    const { t } = await renderAtRoute(<JoinScreen />, {
      api: fakeRoomApi({ previewRoom: call, enterAccessCode }),
      at: '/join/K7M2Q',
      path: '/join/:code',
    });
    await screen.findByRole('dialog', { name: t('accessCode.title') });

    // Act
    enterCode(t, ACCESS_CODE);

    // Assert
    expect(await screen.findByTestId('room-of')).toHaveProperty(
      'textContent',
      t('joinRoom.roomOf', { host: 'Ana', code: 'K7M2Q' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should take whoever came by the link back to the start if they go back', async () => {
    // Arrange
    const { call, enterAccessCode } = closedRoomApi(() => PREVIEW);
    const { t, location } = await renderAtRoute(<JoinScreen />, {
      api: fakeRoomApi({ previewRoom: call, enterAccessCode }),
      at: '/join/K7M2Q',
      path: '/join/:code',
    });
    await screen.findByRole('dialog', { name: t('accessCode.title') });

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('home.back') }));

    // Assert
    await waitFor(() => expect(location()).toBe('/'));
  });
});
