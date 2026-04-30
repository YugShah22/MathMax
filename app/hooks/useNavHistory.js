import { useEffect } from 'react';

/**
 * Registers browser history listeners.
 * Call once on mount. Pass the initial history state and a handler for popstate.
 *
 * @param {object}   initialState  - State to replaceState on mount
 * @param {function} onPop         - Called with e.state when user hits back/forward
 */
export function useNavHistory(initialState, onPop) {
  useEffect(() => {
    window.history.replaceState(initialState, '');
    const handler = (e) => onPop(e.state || {});
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Pushes a new state to the browser history stack.
 * Use this whenever the user navigates to a new view inside the SPA.
 */
export function pushHistory(state) {
  window.history.pushState(state, '');
}
