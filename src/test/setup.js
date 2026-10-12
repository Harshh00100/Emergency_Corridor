import { afterEach, beforeEach } from 'vitest';

// Pure-logic tests avoid importing the DOM environment and React test helpers.
if (typeof window !== 'undefined') {
  await import('@testing-library/jest-dom');
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });
}
