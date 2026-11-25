import { fireEvent, screen, waitFor } from '@testing-library/react';
import type {
  CreateRoomRequestDto,
  CreateRoomResponseDto as CreateRoomResponse,
  DilemmaPreviewResponseDto,
} from '@thelever-app/protocol';
import { describe, expect, it, vi } from 'vitest';
import { RoomApiError } from '../../src/room/room-api.ts';
import { PlayDilemmaScreen } from '../../src/screens/play-dilemma-screen.tsx';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const PREVIEW: DilemmaPreviewResponseDto = {
  dilemmaId: 'dlm-7-en',
  name: 'The lever',
  category: 'life-and-death',
  optionCount: 2,
  minimumAge: 16,
  language: 'en',
  text: 'TestText',
  options: [
    { optionId: 'TestOptionA', text: 'TestOptionA' },
    { optionId: 'TestOptionB', text: 'TestOptionB' },
  ],
  version: 1,
};

async function renderPlay(
  previewDilemma: (publicId: string) => Promise<DilemmaPreviewResponseDto>,
  createRoom = vi.fn<(request: CreateRoomRequestDto) => Promise<CreateRoomResponse>>(async () => ({
    roomId: 'test-room-id',
    code: 'K7M2Q',
    playerId: 'test-ana-id',
  })),
) {
  const api = fakeRoomApi({ previewDilemma: vi.fn(previewDilemma), createRoom });
  const rendered = await renderAtRoute(<PlayDilemmaScreen />, {
    api,
    at: '/new/TestPublicId',
    path: '/new/:publicId',
  });
  return { ...rendered, api, createRoom };
}

describe('PlayDilemmaScreen', () => {
  it('should show the dilemma of the first round, from the public id of the link', async () => {
    // Act
    const { t, api } = await renderPlay(async () => PREVIEW);

    // Assert
    const card = await screen.findByRole('region', {
      name: t('pickDilemmas.title', { number: 1 }),
    });
    expect(card.textContent).toBe(
      'Empezáis por este dilemaThe leverVida y muerte · Las otras 7 rondas, según el ambiente que elijáis.',
    );
    expect(api.previewDilemma).toHaveBeenCalledWith('TestPublicId', { toStartARoom: true });
  });

  it('should show the text of the dilemma when it has no name', async () => {
    // Arrange
    const withoutName: DilemmaPreviewResponseDto = { ...PREVIEW, text: 'Le mientes a {gap}' };
    delete withoutName.name;

    // Act
    const { t } = await renderPlay(async () => withoutName);

    // Assert
    expect((await screen.findByTestId('first-dilemma')).textContent).toContain(
      `Le mientes a ${t('pickDilemmas.someone')}`,
    );
  });

  it('should create a room with that dilemma in its first round, in its language', async () => {
    // Arrange
    const { t, createRoom } = await renderPlay(async () => PREVIEW);
    await screen.findByTestId('first-dilemma');
    fireEvent.change(screen.getByRole('textbox', { name: t('createRoom.nickname') }), {
      target: { value: 'Ana' },
    });
    fireEvent.click(screen.getByRole('radio', { name: t('createRoom.place.together') }));
    fireEvent.click(
      screen.getByRole('radio', { name: new RegExp(`^${t('ambience.classic.name')}`) }),
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: t('createRoom.submit') }));

    // Assert
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/rooms/test-room-id'),
    );
    expect(createRoom).toHaveBeenCalledWith(
      expect.objectContaining({ firstRoundDilemmaId: 'dlm-7-en', dilemmaLanguage: 'en' }),
    );
  });

  it('should tell the visitor when the dilemma of the link is no longer there', async () => {
    // Act
    const { t } = await renderPlay(async () => {
      throw new RoomApiError('dilemma-not-found');
    });

    // Assert
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      t('playDilemma.notFound'),
    );
  });

  it('should say something went wrong, not that the dilemma is gone, when the server does not answer', async () => {
    // Act
    const { t } = await renderPlay(async () => {
      throw new Error('TestNetworkDown');
    });

    // Assert
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', t('roomErrors.unknown'));
  });

  describe('with a dilemma for adults', () => {
    const FOR_ADULTS: DilemmaPreviewResponseDto = { ...PREVIEW, minimumAge: 18 };

    /** Fills in everything but the ambience, which comes chosen. */
    async function fillIn(t: Awaited<ReturnType<typeof renderPlay>>['t']) {
      await screen.findByTestId('first-dilemma');
      fireEvent.change(screen.getByRole('textbox', { name: t('createRoom.nickname') }), {
        target: { value: 'Ana' },
      });
      fireEvent.click(screen.getByRole('radio', { name: t('createRoom.place.together') }));
    }

    const ambience = (t: Awaited<ReturnType<typeof renderPlay>>['t'], name: string) =>
      screen.getByRole('radio', {
        name: new RegExp(`^${t(`ambience.${name as 'classic'}.name`)}`),
      });

    it('should come with Spicy chosen and create a room that starts with it', async () => {
      // Arrange
      const { t, createRoom } = await renderPlay(async () => FOR_ADULTS);
      await fillIn(t);
      const spicyChosen = (ambience(t, 'spicy') as HTMLInputElement).checked;

      // Act
      fireEvent.click(screen.getByRole('button', { name: t('createRoom.submit') }));

      // Assert
      expect(spicyChosen).toBe(true);
      await waitFor(() =>
        expect(createRoom).toHaveBeenCalledWith(
          expect.objectContaining({ ambience: 'spicy', firstRoundDilemmaId: 'dlm-7-en' }),
        ),
      );
    });

    it('should leave the dilemma out of a Classic room, and take it back with Spicy or No filter', async () => {
      // Arrange
      const { t, createRoom } = await renderPlay(async () => FOR_ADULTS);
      await fillIn(t);
      const card = () => screen.getByTestId('first-dilemma');

      // Act
      fireEvent.click(ambience(t, 'classic'));
      const offWithClassic = card().getAttribute('aria-disabled');
      const reason = card().textContent;
      fireEvent.click(ambience(t, 'no-filter'));
      const backWithNoFilter = card().getAttribute('aria-disabled');
      fireEvent.click(ambience(t, 'classic'));
      fireEvent.click(screen.getByRole('button', { name: t('createRoom.submit') }));

      // Assert
      expect(offWithClassic).toBe('true');
      expect(reason).toContain(t('playDilemma.offInClassic'));
      expect(backWithNoFilter).toBeNull();
      await waitFor(() => expect(createRoom).toHaveBeenCalled());
      expect(createRoom.mock.calls[0]![0]).toEqual(
        expect.objectContaining({ ambience: 'classic' }),
      );
      expect(createRoom.mock.calls[0]![0]).not.toHaveProperty('firstRoundDilemmaId');
    });

    it('should tell someone under 18 that the dilemma is only for adults, without it', async () => {
      // Act
      const { t } = await renderPlay(async () => {
        throw new RoomApiError('dilemma-only-for-adults');
      });

      // Assert
      expect(
        await screen.findByRole('heading', {
          name: t('joinRefusal.dilemma-only-for-adults.title'),
        }),
      ).toBeDefined();
      expect(screen.queryByTestId('first-dilemma')).toBeNull();
    });
  });
});
