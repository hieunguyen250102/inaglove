import type { ChipColor } from '@shared/types';

export const CHIP_PALETTE: Record<ChipColor, { base: string; dark: string; name: string }> = {
  red: { base: '#C0492F', dark: '#862F1E', name: 'Đỏ son' },
  blue: { base: '#34618F', dark: '#1F3F63', name: 'Chàm' },
  green: { base: '#56804A', dark: '#34552E', name: 'Lá tre' },
  yellow: { base: '#D6A23C', dark: '#94701F', name: 'Hoàng thổ' },
  purple: { base: '#7C5190', dark: '#533463', name: 'Tím mận' },
};

const INK = '#1E2B45';
const PAPER = '#FBF6EA';

/** Detective side: a moustache. Penalty ("inept detective") side: a big "!". */
export function ChipFace({ color, side = 'front' }: { color: ChipColor; side?: 'front' | 'back' }) {
  const { base, dark } = CHIP_PALETTE[color];
  if (side === 'back') {
    return (
      <svg viewBox="0 0 100 100" className="chip-svg" aria-label="Chip phạt">
        <circle cx="50" cy="50" r="48" fill={dark} />
        <circle cx="50" cy="50" r="44" fill={base} />
        <circle cx="50" cy="50" r="31" fill={PAPER} />
        <path d="M44.5 29 Q50 26 55.5 29 L53 58 Q50 60 47 58 Z" fill={INK} />
        <circle cx="50" cy="68.5" r="5.5" fill={INK} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="chip-svg" aria-label="Chip thám tử">
      <circle cx="50" cy="50" r="48" fill={dark} />
      <circle cx="50" cy="50" r="44" fill={base} />
      <circle cx="50" cy="50" r="37" fill="none" stroke={PAPER} strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="3 4" />
      <path
        d="M50 50 C45 40 30 38 22 46 C18 50 19 57 25 57 C21 53 25 48 30 51 C36 55 44 58 50 55 C56 58 64 55 70 51 C75 48 79 53 75 57 C81 57 82 50 78 46 C70 38 55 40 50 50 Z"
        fill={PAPER}
      />
      <ellipse cx="38" cy="34" rx="16" ry="7" fill="#fff" opacity=".12" transform="rotate(-25 38 34)" />
    </svg>
  );
}
