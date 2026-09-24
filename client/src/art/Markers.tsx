const INK = '#1E2B45';
const PAPER = '#FBF6EA';
const RED = '#B8412E';

const HEX = 'M50 3 L93 27 L93 73 L50 97 L7 73 L7 27 Z';

/** "Đi đầu" — the first-on-the-scene (discoverer) marker. */
export function DiscovererMarker({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label="Người đi đầu">
      <path d={HEX} fill={PAPER} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M36 50 Q36 26 50 26 Q64 26 64 50 Z" fill={INK} />
      <path d="M44 28 Q50 33 56 28" fill="none" stroke={PAPER} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="36" y="42" width="28" height="5" fill={RED} />
      <ellipse cx="50" cy="51" rx="27" ry="6" fill={INK} />
      <path d="M43 64 L57 64 L50 74 Z" fill={RED} />
    </svg>
  );
}

/** "Chưa xem" — placed over the suspect the discoverer did not look at. */
export function UnseenMarker({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label="Chưa xem">
      <path d={HEX} fill={INK} stroke={PAPER} strokeWidth="4" strokeLinejoin="round" />
      <g fill="none" stroke={PAPER} strokeWidth="5" strokeLinecap="round">
        <path d="M26 48 Q50 66 74 48" />
        <path d="M34 56 L29 63 M44 60 L42 68 M56 60 L58 68 M66 56 L71 63" strokeWidth="4" />
        <path d="M31 30 L69 70" stroke={RED} strokeWidth="6" />
      </g>
    </svg>
  );
}
