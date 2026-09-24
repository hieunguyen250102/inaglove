import { motion } from 'framer-motion';
import type { FigureValue } from '@shared/types';

const INK = '#1E2B45';
const PAPER = '#FBF6EA';
const RED = '#B8412E';

/** Silhouette parts; drawn twice (stroked, then filled) so the outline reads as one shape. */
function Body({ fill, stroke, strokeWidth }: { fill: string; stroke: string; strokeWidth: number }) {
  const common = { fill, stroke, strokeWidth, strokeLinejoin: 'round' as const };
  return (
    <g {...common}>
      <circle cx="50" cy="26" r="17" />
      <rect x="43" y="38" width="14" height="12" />
      <rect x="18" y="49" width="13" height="42" rx="6.5" transform="rotate(16 30 52)" />
      <rect x="69" y="49" width="13" height="42" rx="6.5" transform="rotate(-16 70 52)" />
      <rect x="29" y="46" width="42" height="50" rx="11" />
      <rect x="31" y="86" width="17" height="48" rx="8" />
      <rect x="52" y="86" width="17" height="48" rx="8" />
    </g>
  );
}

function Silhouette({ fill, outline }: { fill: string; outline: string }) {
  return (
    <>
      <Body fill={outline} stroke={outline} strokeWidth={7} />
      <Body fill={fill} stroke="none" strokeWidth={0} />
    </>
  );
}

/** A little character touch per number so the fronts feel like a cast, not a spreadsheet. */
function Accessory({ value }: { value: FigureValue }) {
  const eyes = (
    <g fill={INK}>
      <circle cx="43.5" cy="28" r="1.8" />
      <circle cx="56.5" cy="28" r="1.8" />
    </g>
  );
  switch (value) {
    case 2: // conical straw hat
      return (
        <g>
          {eyes}
          <path d="M22 18 L50 2 L78 18 Q50 24 22 18 Z" fill="#C9A45C" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M36 14 L50 5 L64 14" fill="none" stroke={INK} strokeWidth="1" opacity=".5" />
        </g>
      );
    case 3: // fedora
      return (
        <g>
          {eyes}
          <path d="M37 14 Q38 3 50 4 Q62 3 63 14 Z" fill={INK} />
          <rect x="37" y="11" width="26" height="3.5" fill={RED} />
          <ellipse cx="50" cy="15" rx="21" ry="3.6" fill={INK} />
        </g>
      );
    case 4: // spectacles
      return (
        <g fill="none" stroke={INK} strokeWidth="1.8">
          <circle cx="43" cy="27.5" r="5" fill="#fff" fillOpacity=".5" />
          <circle cx="57" cy="27.5" r="5" fill="#fff" fillOpacity=".5" />
          <path d="M48 27.5 H52" />
          <circle cx="43" cy="27.5" r="1.4" fill={INK} stroke="none" />
          <circle cx="57" cy="27.5" r="1.4" fill={INK} stroke="none" />
        </g>
      );
    case 5: // red cloche hat — the number that flips the rule
      return (
        <g>
          {eyes}
          <path d="M31 21 Q31 5 50 5 Q69 5 69 21 Q50 16 31 21 Z" fill={RED} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="63" cy="14" r="3" fill={PAPER} stroke={INK} strokeWidth="1.2" />
          <path d="M45 34 Q50 36.5 55 34" fill="none" stroke={RED} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    case 6: // flat cap and bow tie
      return (
        <g>
          {eyes}
          <path d="M33 16 Q36 6 50 6 Q64 6 66 14 L74 17 Q60 19 33 17 Z" fill="#5D6B52" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M42 46 L50 50 L42 54 Z M58 46 L50 50 L58 54 Z" fill={RED} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        </g>
      );
    case 7: // moustache
      return (
        <g>
          {eyes}
          <path
            d="M50 34 C46 30 38 31 36 36 C39 34 43 36 46 36.5 C48 36.8 49.4 35.8 50 35 C50.6 35.8 52 36.8 54 36.5 C57 36 61 34 64 36 C62 31 54 30 50 34 Z"
            fill={INK}
          />
        </g>
      );
    case 8: // round glasses and bow tie
      return (
        <g>
          <g fill="none" stroke={INK} strokeWidth="1.6">
            <circle cx="43" cy="27.5" r="4.6" />
            <circle cx="57" cy="27.5" r="4.6" />
            <path d="M47.6 27.5 H52.4" />
          </g>
          <circle cx="43" cy="27.5" r="1.4" fill={INK} />
          <circle cx="57" cy="27.5" r="1.4" fill={INK} />
          <path d="M42 46 L50 50 L42 54 Z M58 46 L50 50 L58 54 Z" fill={INK} />
        </g>
      );
    default:
      return null;
  }
}

export function FigureFront({ value }: { value: FigureValue }) {
  const isX = value === 'X';
  return (
    <svg viewBox="-4 -4 108 144" className="figure-svg" aria-label={`Quân ${value}`}>
      <Silhouette fill={isX ? '#FFFFFF' : PAPER} outline={INK} />
      <Accessory value={value} />
      <text
        x="50"
        y={isX ? 82 : 83}
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="900"
        fontSize={isX ? 34 : 36}
        fill={value === 5 ? RED : INK}
        style={{ fontVariantNumeric: 'lining-nums' }}
      >
        {value}
      </text>
    </svg>
  );
}

/** Every back is identical — that is the whole point of the game. */
export function FigureBack() {
  return (
    <svg viewBox="-4 -4 108 144" className="figure-svg" aria-label="Quân úp">
      <Silhouette fill="#2A3A5E" outline={PAPER} />
      <g transform="translate(50 72)" fill="none" stroke="#D8C9A3" strokeWidth="1.6" strokeLinecap="round" opacity=".85">
        <path d="M0 -14 V14" />
        <path d="M-4 -7 H4 M-4 3 H4" />
        <path d="M0 -6 Q9 -12 13 -20 Q5 -16 0 -6" fill="#D8C9A3" fillOpacity=".35" />
        <path d="M0 5 Q-9 -1 -13 -9 Q-5 -5 0 5" fill="#D8C9A3" fillOpacity=".35" />
      </g>
    </svg>
  );
}

interface FlipFigureProps {
  value: FigureValue | null;
  faceUp: boolean;
  size?: number;
  delay?: number;
  lying?: boolean;
}

/** A figure that flips in 3D between its identical back and its numbered front. */
export function FlipFigure({ value, faceUp, size = 90, delay = 0, lying = false }: FlipFigureProps) {
  const showFront = faceUp && value !== null;
  return (
    <div
      className={`flip-figure${lying ? ' lying' : ''}`}
      style={{ width: size, height: size * 1.333 }}
    >
      <motion.div
        className="flip-inner"
        initial={false}
        animate={{ rotateY: showFront ? 180 : 0 }}
        transition={{ duration: 0.7, delay, ease: [0.3, 1.4, 0.5, 1] }}
      >
        <div className="flip-face">
          <FigureBack />
        </div>
        <div className="flip-face flip-front">{value !== null && <FigureFront value={value} />}</div>
      </motion.div>
    </div>
  );
}
