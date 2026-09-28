/** Resolves once the page has loaded and the main thread is idle (browser only). */
export function afterLoad() {
  return new Promise<void>((resolve) => {
    const idle = () => (window.requestIdleCallback ? window.requestIdleCallback(() => resolve()) : setTimeout(resolve, 1));

    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
}

const INTERACTIONS = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel", "scroll"] as const;

/** Resolves at the visitor's first interaction with the page: a pointer, a key, a touch or a scroll (browser only). */
export function firstInteraction() {
  return new Promise<void>((resolve) => {
    const done = () => {
      INTERACTIONS.forEach((type) => window.removeEventListener(type, done, true));
      resolve();
    };

    INTERACTIONS.forEach((type) => window.addEventListener(type, done, { capture: true, passive: true }));
  });
}
