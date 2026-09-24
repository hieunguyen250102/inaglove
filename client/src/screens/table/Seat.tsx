import { AnimatePresence, motion } from 'framer-motion';
import { CHIPS_PER_PLAYER } from '@shared/rules';
import type { Chip, FigureValue, PublicPlayer } from '@shared/types';
import { ChipFace } from '../../art/Chip';
import { FlipFigure } from '../../art/Figure';
import { DiscovererMarker } from '../../art/Markers';
import { useStore } from '../../store';

interface SeatProps {
  player: PublicPlayer;
  isMe: boolean;
  isCurrent: boolean;
  isDiscoverer: boolean;
  turnNo: number | null;
  status: string | null;
  handValue: FigureValue | null;
  handRevealed: boolean;
  hiddenPenaltyIds: Set<string>;
  /** Own detective chips live in the dossier tray, so the seat shows only a count. */
  showChips: boolean;
}

export function Seat(props: SeatProps) {
  const { player, isMe, isCurrent, isDiscoverer, turnNo, status, handValue, handRevealed, hiddenPenaltyIds, showChips } = props;
  const { reactions } = useStore();
  const placed = CHIPS_PER_PLAYER - player.detective;
  const penalties = player.penaltyChips.filter((c) => !hiddenPenaltyIds.has(c.id));

  return (
    <motion.div
      layout
      className={`seat${isCurrent ? ' current' : ''}${isMe ? ' me' : ''}${player.connected ? '' : ' offline'}`}
      animate={isCurrent ? { y: -4 } : { y: 0 }}
    >
      <div className="seat-reactions">
        <AnimatePresence>
          {reactions
            .filter((r) => r.playerId === player.id)
            .map((r) => (
              <motion.span
                key={r.id}
                className="reaction-bubble"
                initial={{ y: 10, opacity: 0, scale: 0.4 }}
                animate={{ y: -46, opacity: 1, scale: 1.25 }}
                exit={{ y: -80, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 12 }}
              >
                {r.emoji}
              </motion.span>
            ))}
        </AnimatePresence>
      </div>

      <div className="seat-head">
        {turnNo !== null && <span className="turn-no">{turnNo}</span>}
        <span className="seat-name" title={player.name}>
          {player.name}
          {isMe && <em> (bạn)</em>}
        </span>
        <AnimatePresence>
          {isDiscoverer && (
            <motion.span
              className="seat-marker"
              layoutId="discoverer-marker"
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              title="Người đi đầu"
            >
              <DiscovererMarker size={30} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="seat-body">
        <div className="seat-figure">
          <FlipFigure value={handValue} faceUp={handRevealed} size={30} />
        </div>
        <div className="seat-chips">
          <div className="mini-stack" title={`${player.detective} chip thám tử`}>
            {showChips
              ? Array.from({ length: player.detective }, (_, k) => {
                  const id = `${player.id}:${placed + k}`;
                  return (
                    <motion.span key={id} layoutId={`chip-${id}`} className="mini-chip" style={{ left: k * 5 }}>
                      <ChipFace color={player.color} />
                    </motion.span>
                  );
                })
              : null}
            <span className="mini-count">{player.detective}</span>
          </div>
          <PenaltyPile chips={penalties} />
        </div>
      </div>

      <div className="seat-status">
        {!player.connected ? <span className="status-off">mất kết nối</span> : status && <span>{status}</span>}
      </div>
    </motion.div>
  );
}

function PenaltyPile({ chips }: { chips: Chip[] }) {
  return (
    <div className={`penalty-pile${chips.length ? '' : ' empty'}`} title={`${chips.length} chip phạt`}>
      {chips.map((c, k) => (
        <motion.span
          key={c.id}
          layoutId={`chip-${c.id}`}
          className="mini-chip penalty"
          style={{ left: k * 6, zIndex: k }}
          initial={{ rotateY: 180 }}
          animate={{ rotateY: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 16 }}
        >
          <ChipFace color={c.color} side="back" />
        </motion.span>
      ))}
      <span className={`penalty-count${chips.length >= 3 ? ' danger' : ''}`}>{chips.length}</span>
    </div>
  );
}
