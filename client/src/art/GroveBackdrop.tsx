import { useMemo } from 'react';

/** Swaying bamboo at the page edges and a few drifting leaves. Pure CSS animation, no JS per frame. */
export function GroveBackdrop({ dense = false }: { dense?: boolean }) {
  const stalks = useMemo(() => {
    const list: { x: number; w: number; h: number; tone: number; delay: number; side: 'l' | 'r' }[] = [];
    const count = dense ? 9 : 6;
    for (let i = 0; i < count; i++) {
      list.push({ x: i * 34 + (i % 2) * 11, w: 10 + (i % 3) * 4, h: 88 + (i % 4) * 4, tone: i % 3, delay: -i * 1.7, side: 'l' });
      list.push({ x: i * 36 + (i % 3) * 7, w: 9 + ((i + 1) % 3) * 4, h: 86 + ((i + 2) % 4) * 4, tone: (i + 1) % 3, delay: -i * 1.3, side: 'r' });
    }
    return list;
  }, [dense]);

  const leaves = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        left: 8 + ((i * 137) % 84),
        delay: i * 3.1,
        duration: 14 + (i % 4) * 3,
        red: i % 3 === 0,
      })),
    [],
  );

  return (
    <div className="grove-backdrop" aria-hidden>
      {(['l', 'r'] as const).map((side) => (
        <div key={side} className={`grove-side grove-${side}`}>
          {stalks
            .filter((s) => s.side === side)
            .map((s, i) => (
              <div
                key={i}
                className={`stalk tone-${s.tone}`}
                style={{ left: s.x, width: s.w, height: `${s.h}vh`, animationDelay: `${s.delay}s` }}
              >
                <span className="node" style={{ top: '18%' }} />
                <span className="node" style={{ top: '41%' }} />
                <span className="node" style={{ top: '64%' }} />
                <span className="leaf-tuft" style={{ top: `${10 + (i % 3) * 14}%` }} />
              </div>
            ))}
        </div>
      ))}
      {leaves.map((l, i) => (
        <span
          key={i}
          className={`falling-leaf${l.red ? ' red' : ''}`}
          style={{ left: `${l.left}%`, animationDelay: `${l.delay}s`, animationDuration: `${l.duration}s` }}
        />
      ))}
    </div>
  );
}

/** Title lockup used on the home screen. */
export function TitleArt() {
  return (
    <div className="title-art">
      <svg viewBox="0 0 400 150" className="title-sun" aria-hidden>
        <circle cx="200" cy="80" r="62" fill="#B8412E" opacity=".92" />
        <g stroke="#F3ECDC" strokeWidth="2" opacity=".5">
          <path d="M120 96 H280" />
          <path d="M134 108 H266" />
          <path d="M150 120 H250" />
        </g>
      </svg>
      <h1 className="title-main">
        <span>In a</span> Grove
      </h1>
      <p className="title-sub">Trong lùm cây · Ai là hung thủ?</p>
    </div>
  );
}
