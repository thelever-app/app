import { fireEvent, screen, within } from '@testing-library/react';
import type { DilemmaPreviewResponseDto, WorldResultResponseDto } from '@thelever-app/protocol';
import { GAP_MARKER } from '@thelever-app/protocol';
import { describe, expect, it, vi } from 'vitest';
import { RoomApiError } from '../../src/room/room-api.ts';
import { VoteAloneScreen } from '../../src/vote-alone/vote-alone-screen.tsx';
import { type WorldVotes, worldVotes } from '../../src/vote-alone/world-votes.ts';
import { fakeRoomApi, renderAtRoute } from '../support/routing.tsx';

const PREVIEW: DilemmaPreviewResponseDto = {
  dilemmaId: 'dlm-7',
  name: 'La palanca',
  category: 'life-and-death',
  optionCount: 2,
  minimumAge: 16,
  language: 'es',
  text: `¿Bajas la palanca aunque arrolle a ${GAP_MARKER}?`,
  options: [
    { optionId: 'TestOptionA', text: 'La bajo' },
    { optionId: 'TestOptionB', text: `Salvo a ${GAP_MARKER}` },
  ],
  version: 2,
};

const FEW: WorldResultResponseDto = { shown: false, answers: 12, needed: 20 };

const SHOWN: WorldResultResponseDto = {
  shown: true,
  answers: 1206,
  options: [
    { optionId: 'TestOptionA', percentage: 81 },
    { optionId: 'TestOptionB', percentage: 19 },
  ],
  yours: { percentage: 81, predictionOff: 11 },
};

/** The votes of a device that keeps them only in memory. */
function deviceVotes(): WorldVotes {
  const items = new Map<string, string>();
  return worldVotes(() => ({
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  }));
}

async function renderVote({
  result = FEW,
  voteAlone = vi.fn(async () => undefined),
  votes = deviceVotes(),
  at = '/vote/TestPublicId?lang=es&back=%2Fes%2Fvida-y-muerte%2Fla-palanca-7',
}: {
  result?: WorldResultResponseDto;
  voteAlone?: (publicId: string, optionId: string) => Promise<void>;
  votes?: WorldVotes;
  at?: string;
} = {}) {
  const api = fakeRoomApi({
    previewDilemma: vi.fn(async () => PREVIEW),
    voteAlone: vi.fn(voteAlone),
    worldResult: vi.fn(async () => result),
  });
  const rendered = await renderAtRoute(<VoteAloneScreen votes={votes} />, {
    api,
    at,
    path: '/vote/:publicId',
  });
  return { ...rendered, api, votes };
}

/** Votes the first option with the prediction the screen starts with, with the button that says `see`. */
async function voteTheFirstOption(see: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'La bajo' }));
  fireEvent.click(screen.getByRole('button', { name: see }));
}

describe('VoteAloneScreen', () => {
  it('should show the dilemma to vote alone, with the gap in words, its options and the prediction', async () => {
    // Act
    const { t } = await renderVote();

    // Assert
    expect(await screen.findByRole('heading', { name: 'La palanca' })).toBeDefined();
    expect(screen.getAllByText(new RegExp(t('voteAlone.someoneInYourGroup'))).length).toBe(2);
    expect(screen.getByRole('button', { name: 'La bajo' })).toBeDefined();
    expect(screen.getByRole('slider', { name: t('voteAlone.prediction') })).toBeDefined();
    expect(screen.getByRole('button', { name: t('voteAlone.see') }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('should vote, keep the vote and the prediction on the device and show the world result', async () => {
    // Arrange
    const { t, api, votes } = await renderVote();
    fireEvent.change(await screen.findByRole('slider'), { target: { value: '70' } });

    // Act
    await voteTheFirstOption(t('voteAlone.see'));

    // Assert
    expect(await screen.findByText(t('voteAlone.fewTitle'))).toBeDefined();
    expect(api.voteAlone).toHaveBeenCalledWith('TestPublicId', 'TestOptionA');
    expect(api.worldResult).toHaveBeenCalledWith('TestPublicId', 'TestOptionA', 70);
    expect(votes.voteOf('TestPublicId')).toEqual({
      optionId: 'TestOptionA',
      prediction: 70,
      version: 2,
    });
  });

  it('should say how many answers there are and how many it needs while there are too few, with no figures', async () => {
    // Act
    const { t } = await renderVote();
    await voteTheFirstOption(t('voteAlone.see'));

    // Assert
    const result = await screen.findByTestId('world-result');
    expect(result.textContent).toContain(t('voteAlone.fewBody', { count: 12, needed: 20 }));
    expect(result.textContent).not.toContain('%');
  });

  it('should show how the world voted, which share thought like the visitor and how far their prediction was', async () => {
    // Act
    const { t } = await renderVote({ result: SHOWN });
    await voteTheFirstOption(t('voteAlone.see'));

    // Assert
    const result = await screen.findByTestId('world-result');
    expect(result.textContent).toContain(t('voteAlone.sameAsYou', { percentage: 81 }));
    expect(result.textContent).toContain(
      t('voteAlone.predictionOff', { prediction: 50, count: 11 }),
    );
    expect(within(result).getByText(t('voteAlone.yours', { option: 'La bajo' }))).toBeDefined();
    expect(result.textContent).toContain('19 %');
    expect(result.textContent).toContain(`Salvo a ${t('voteAlone.someoneInYourGroup')}`);
    expect(result.textContent).not.toContain(GAP_MARKER);
  });

  it('should show the world result straight away to a device that already voted the dilemma', async () => {
    // Arrange
    const votes = deviceVotes();
    votes.save('TestPublicId', { optionId: 'TestOptionB', prediction: 30, version: 2 });

    // Act
    const { t, api } = await renderVote({ votes });

    // Assert
    expect(await screen.findByText(t('voteAlone.fewTitle'))).toBeDefined();
    expect(screen.queryByRole('button', { name: t('voteAlone.see') })).toBeNull();
    expect(api.worldResult).toHaveBeenCalledWith('TestPublicId', 'TestOptionB', 30);
  });

  it('should offer to vote again a dilemma that changed since the device voted it', async () => {
    // Arrange: the device voted the version 1, and the dilemma is now at its version 2.
    const votes = deviceVotes();
    votes.save('TestPublicId', { optionId: 'TestOptionB', prediction: 30, version: 1 });

    // Act
    const { t, api } = await renderVote({ votes });

    // Assert
    expect(await screen.findByRole('button', { name: t('voteAlone.see') })).toBeDefined();
    expect(api.worldResult).not.toHaveBeenCalled();
  });

  it('should announce the world result and say the prediction as a percentage', async () => {
    // Act
    const { t } = await renderVote();
    fireEvent.change(await screen.findByRole('slider'), { target: { value: '70' } });

    // Assert
    expect(screen.getByRole('slider').getAttribute('aria-valuetext')).toBe(
      t('voteAlone.percent', { value: 70 }),
    );
    await voteTheFirstOption(t('voteAlone.see'));
    const result = await screen.findByTestId('world-result');
    expect(within(result).getByRole('status').textContent).toContain(t('voteAlone.fewTitle'));
  });

  it('should show the world result when the server had already counted a vote of the visitor', async () => {
    // Act
    const { t, votes } = await renderVote({
      voteAlone: async () => {
        throw new RoomApiError('already-voted');
      },
    });
    await voteTheFirstOption(t('voteAlone.see'));

    // Assert
    expect(await screen.findByText(t('voteAlone.fewTitle'))).toBeDefined();
    expect(votes.voteOf('TestPublicId')).toEqual({
      optionId: 'TestOptionA',
      prediction: 50,
      version: 2,
    });
  });

  it('should lead back to the arguments on the public page the link came from', async () => {
    // Act
    const { t } = await renderVote();
    await voteTheFirstOption(t('voteAlone.see'));

    // Assert
    expect(
      (await screen.findByRole('link', { name: t('voteAlone.arguments') })).getAttribute('href'),
    ).toBe('/es/vida-y-muerte/la-palanca-7');
    expect(screen.getByRole('link', { name: t('voteAlone.play') }).getAttribute('href')).toBe(
      '/new/TestPublicId',
    );
  });

  it('should not lead anywhere outside the public web, whatever the link says', async () => {
    // Act
    const { t } = await renderVote({ at: '/vote/TestPublicId?back=https%3A%2F%2Fexample.com' });
    await voteTheFirstOption(t('voteAlone.see'));
    await screen.findByTestId('world-result');

    // Assert
    expect(screen.queryByRole('link', { name: t('voteAlone.arguments') })).toBeNull();
  });

  it('should say the dilemma is no longer there when the link leads to none', async () => {
    // Arrange
    const api = fakeRoomApi({
      previewDilemma: vi.fn(async () => {
        throw new RoomApiError('dilemma-not-found');
      }),
    });

    // Act
    const { t } = await renderAtRoute(<VoteAloneScreen votes={deviceVotes()} />, {
      api,
      at: '/vote/TestPublicId',
      path: '/vote/:publicId',
    });

    // Assert
    expect((await screen.findByRole('alert')).textContent).toBe(t('voteAlone.notFound'));
  });
});
