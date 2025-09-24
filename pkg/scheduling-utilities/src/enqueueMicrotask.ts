/**
 * Enqueues a function to be run after everything this frame but before the start
 * of the next frame using `Promise.resolve`.
 *
 * See this document on {@link https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide microtasks}.
 * @param {Function} func
 * @returns {void}
 */
function enqueueMicrotask(func: () => void) {
    Promise.resolve().then(func);
}

export { enqueueMicrotask };
