import { useEffect, useRef } from 'react';

const DEPTH_KEY = '__foodshareNestedDepth';

/** Adds one browser-history step while a nested screen is open. */
export function useNestedBack(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  const depthRef = useRef<number | null>(null);
  const ignoreNextPopRef = useRef(false);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return;
    const state = window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {};
    const depth = Number(state[DEPTH_KEY] ?? 0) + 1;
    depthRef.current = depth;
    window.history.pushState({ ...state, [DEPTH_KEY]: depth }, '', window.location.href);

    const handlePop = (event: PopStateEvent) => {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }
      const destinationDepth = Number(event.state?.[DEPTH_KEY] ?? 0);
      if (depthRef.current !== null && destinationDepth < depthRef.current) {
        depthRef.current = null;
        onBackRef.current();
      }
    };
    window.addEventListener('popstate', handlePop);

    return () => {
      window.removeEventListener('popstate', handlePop);
      const currentState = window.history.state && typeof window.history.state === 'object'
        ? window.history.state
        : {};
      if (depthRef.current !== null && Number(currentState[DEPTH_KEY]) === depthRef.current) {
        depthRef.current = null;
        ignoreNextPopRef.current = true;
        window.history.back();
      }
    };
  }, [active]);
}
