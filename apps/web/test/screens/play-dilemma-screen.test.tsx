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
    expect(api.previewDilemma).toHaveBeenCalledWith('TestPublicId');
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
    fireEvent.click(screen.getByRole('radio', { name: t('createRoom.groupNature.friends') }));
    fireEvent.click(screen.getByRole('radio', { name: t('createRoom.place.together') }));
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(t('ambience.classic.name')) }));

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
});
