/** Resolves once the page has loaded and the main thread is idle (browser only). */
export function afterLoad() {
  return new Promise<void>((resolve) => {
    const idle = () => (window.requestIdleCallback ? window.requestIdleCallback(() => resolve()) : setTimeout(resolve, 1));

    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
}
