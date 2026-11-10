import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { SoundEffects } from './sound-effects.ts';
import type { SoundPreference } from './sound-preference.ts';

interface Sound {
  readonly effects: SoundEffects;
  readonly preference: SoundPreference;
}

const SoundContext = createContext<Sound | undefined>(undefined);

interface SoundProviderProps extends Sound {
  readonly children: ReactNode;
}

/** Gives every screen below the sound of the game and whether its player muted it. */
export function SoundProvider({ effects, preference, children }: SoundProviderProps) {
  return <SoundContext value={{ effects, preference }}>{children}</SoundContext>;
}

function useSound(): Sound {
  const sound = useContext(SoundContext);
  if (!sound) throw new Error('The sound of the game needs a SoundProvider above it');
  return sound;
}

/** What plays the moments of the game; only below SoundProvider. */
export function useSoundEffects(): SoundEffects {
  return useSound().effects;
}

/** Whether the player muted the game on this device, and how to change it; only below SoundProvider. */
export function useMuted(): readonly [boolean, (muted: boolean) => void] {
  const { preference } = useSound();
  const subscribe = useCallback(
    (onChange: () => void) => preference.subscribe(onChange),
    [preference],
  );
  const muted = useSyncExternalStore(subscribe, preference.isMuted);
  return [muted, preference.setMuted];
}
