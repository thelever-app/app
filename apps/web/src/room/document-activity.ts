import type { PageActivity } from './pause-watcher.ts';

/** A touch, a click with any pointer, or a key: what tells that someone uses the page. */
const INTERACTIONS = ['pointerdown', 'keydown'] as const;

/** What the browser's document says about being used. */
export function documentActivity(page: Document): PageActivity {
  return {
    isVisible: () => page.visibilityState === 'visible',
    onVisibilityChange: (listener) => {
      const onChange = () => listener(page.visibilityState === 'visible');
      page.addEventListener('visibilitychange', onChange);
      return () => page.removeEventListener('visibilitychange', onChange);
    },
    onInteraction: (listener) => {
      for (const type of INTERACTIONS) page.addEventListener(type, listener, { passive: true });
      return () => {
        for (const type of INTERACTIONS) page.removeEventListener(type, listener);
      };
    },
  };
}
