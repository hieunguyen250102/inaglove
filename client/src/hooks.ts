import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** Milliseconds since `key` last changed while `active`; stops ticking after `maxMs`. */
export function useElapsed(active: boolean, key: string, maxMs: number) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!active) return;
    const start = performance.now();
    const id = setInterval(() => {
      const t = performance.now() - start;
      setElapsed(t);
      if (t > maxMs) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [active, key, maxMs]);
  return elapsed;
}

/** Reveal choreography, in ms after the reveal starts. */
export const REVEAL = {
  suspect: (i: number) => 700 + i * 750,
  victim: 3000,
  hands: 3300,
  stamp: 3900,
  resolve: 5600,
  panel: 6800,
  end: 7200,
};
