// jsdom has no AnimationEvent, and without it React listens for the prefixed animation events. This
// file loads before anything imports React, so a test can end an animation with fireEvent.animationEnd.
if (!('AnimationEvent' in globalThis)) {
  Object.defineProperty(globalThis, 'AnimationEvent', {
    value: class AnimationEvent extends Event {},
  });
}
