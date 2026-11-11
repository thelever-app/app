import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useRoomApi } from '../room/room-api-context.tsx';
import { AccessCodeScreen } from './access-code-screen.tsx';
import { codeOf } from './room-error.ts';

/** The code the player entered, or none if they went back. */
type Answer = (code: string | undefined) => void;

/** The access code screen while a call waits for the player to write the code. */
interface Asking {
  readonly refused: boolean;
  readonly checking: boolean;
}

export interface AccessGate {
  /**
   * Runs a call to the room server. While the environment asks for the access code and the
   * device has none that works, it asks the player for it and runs the call again with it; if
   * the player goes back, it gives up and resolves with nothing.
   */
  readonly withAccess: <T>(call: () => Promise<T>) => Promise<T | undefined>;
  /** The screen that asks for the code, to render over the one that made the call; null otherwise. */
  readonly accessCodeScreen: ReactNode;
}

/**
 * The gate of a closed environment, for a screen that creates a room or enters one. The code
 * the player writes stays on the device, so they write it once (see `deviceAccessCode`).
 */
export function useAccessGate(onBack?: () => void): AccessGate {
  const api = useRoomApi();
  const [asking, setAsking] = useState<Asking>();
  // The call waiting for the player. It never waits for good: an action that never ends would
  // hold back every transition after it, the navigations too.
  const waiting = useRef<Answer>(undefined);
  useEffect(() => () => waiting.current?.(undefined), []);
  // Each ask is a turn: a call another one replaced leaves the screen to the one that replaced it.
  const turn = useRef(0);

  const ask = useCallback((refused: boolean) => {
    waiting.current?.(undefined);
    return new Promise<string | undefined>((answer) => {
      waiting.current = (code) => {
        waiting.current = undefined;
        answer(code);
      };
      setAsking({ refused, checking: false });
    });
  }, []);

  const withAccess = useCallback(
    async <T,>(call: () => Promise<T>): Promise<T | undefined> => {
      // The turn of this call, once it asked; only then the screen is its own to close.
      let mine: number | undefined;
      const close = () => {
        if (mine !== undefined && turn.current === mine) setAsking(undefined);
      };
      for (let refused = false; ; refused = true) {
        try {
          const result = await call();
          close();
          return result;
        } catch (error) {
          if (codeOf(error) !== 'invalid-access-code') {
            close();
            throw error;
          }
          mine = ++turn.current;
          const code = await ask(refused);
          if (code === undefined) {
            close();
            return undefined;
          }
          setAsking({ refused, checking: true });
          api.enterAccessCode(code);
        }
      }
    },
    [api, ask],
  );

  const accessCodeScreen = asking ? (
    <AccessCodeScreen
      refused={asking.refused}
      checking={asking.checking}
      onEnter={(code) => waiting.current?.(code)}
      onBack={() => {
        waiting.current?.(undefined);
        onBack?.();
      }}
    />
  ) : null;

  return { withAccess, accessCodeScreen };
}
