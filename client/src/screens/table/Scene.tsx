import { AnimatePresence, motion } from 'framer-motion';
import { RULE_TEXT } from '@shared/rules';
import type { FigureValue, GameView } from '@shared/types';
import { ChipFace } from '../../art/Chip';
import { FlipFigure } from '../../art/Figure';
import { UnseenMarker } from '../../art/Markers';
import { REVEAL } from '../../hooks';

export const SUSPECT_NAMES = ['A', 'B', 'C'];

interface SceneProps {
  view: GameView;
  revealT: number;
  /** Suspect whose front the local player is being shown right now after a peek. */
  flash: number | null;
  lifted: Record<number, string>;
  peekable: number[];
  accusable: boolean;
  selected: number | null;
  figureSize: number;
  onPeek: (s: number) => void;
  onSelect: (s: number) => void;
}

export function Scene(props: SceneProps) {
  const { view, revealT, flash, lifted, peekable, accusable, selected, figureSize, onPeek, onSelect } = props;
  const round = view.round!;
  const reveal = view.phase === 'reveal' ? round.reveal : null;
  const known = view.private?.known ?? {};
  const resolved = !!reveal && revealT >= REVEAL.resolve;
  const stamped = !!reveal && revealT >= REVEAL.stamp;
  const myTurn = round.currentPlayerId === view.youId;
  const isFollower = myTurn && round.turnIndex > 0;
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';

  return (
    <div className="scene">
      <div className="scene-grain" aria-hidden />
      <div className="scene-side">
        <motion.div
          key={`victim-${round.number}`}
          className="victim"
          initial={{ opacity: 0, x: -40, rotate: -10 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 90, damping: 14 }}
        >
          <div className="victim-shadow" />
          <FlipFigure
            value={reveal?.victim ?? null}
            faceUp={!!reveal && revealT >= REVEAL.victim}
            size={figureSize * 0.62}
            lying
          />
          <span className="slot-label">Nạn nhân</span>
        </motion.div>
        {round.faceUp !== null && (
          <motion.div
            key={`faceup-${round.number}`}
            className="faceup"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <FlipFigure value={round.faceUp} faceUp size={figureSize * 0.55} delay={0.9} />
            <span className="slot-label">Lật ngửa</span>
          </motion.div>
        )}
      </div>

      <div className="suspects">
        {[0, 1, 2].map((i) => {
          const chips = round.stacks[i];
          const canPeek = peekable.includes(i);
          const canAccuse = accusable;
          const isLocked = isFollower && round.lockedSuspect === i && round.peekedThisTurn.length < 2;
          const isMurderer = !!reveal && reveal.murderer === i;
          const faceUp = reveal ? revealT >= REVEAL.suspect(i) : flash === i;
          const value: FigureValue | null = reveal ? reveal.suspects[i] : (known[i] ?? null);
          const liftedBy = lifted[i];
          const clickable = canPeek || canAccuse;
          const outcome = reveal?.outcomes.find((o) => o.suspect === i);

          return (
            <div
              key={i}
              className={[
                'suspect-slot',
                clickable ? 'clickable' : '',
                selected === i ? 'selected' : '',
                isLocked ? 'locked' : '',
                stamped && isMurderer ? 'murderer' : '',
                stamped && !isMurderer ? 'innocent' : '',
              ].join(' ')}
              onClick={() => (canPeek ? onPeek(i) : canAccuse ? onSelect(i) : undefined)}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={(e) => e.key === 'Enter' && (canPeek ? onPeek(i) : canAccuse && onSelect(i))}
              aria-label={`Nghi phạm ${SUSPECT_NAMES[i]}`}
            >
              <span className="slot-label">Nghi phạm {SUSPECT_NAMES[i]}</span>
              <div className="marker-spot">
                <AnimatePresence>
                  {round.unseenSuspect === i && (
                    <motion.div
                      className="unseen"
                      initial={{ y: -60, rotate: -35, opacity: 0, scale: 1.4 }}
                      animate={{ y: 0, rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                      title="Người đi đầu chưa xem nghi phạm này"
                    >
                      <UnseenMarker size={38} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.div
                key={`fig-${round.number}-${i}`}
                className="figure-wrap"
                initial={{ y: -140, opacity: 0, rotate: -12 + i * 12 }}
                animate={{
                  y: liftedBy ? -22 : 0,
                  opacity: 1,
                  rotate: liftedBy ? -6 : 0,
                  scale: stamped && isMurderer ? 1.08 : 1,
                }}
                transition={{ type: 'spring', stiffness: 150, damping: 13, delay: liftedBy ? 0 : 0.2 + i * 0.15 }}
                whileHover={clickable ? { y: -10 } : undefined}
              >
                <FlipFigure value={value} faceUp={faceUp} size={figureSize} />
              </motion.div>

              <AnimatePresence>
                {liftedBy && (
                  <motion.span
                    className="peek-label"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {liftedBy} đang xem…
                  </motion.span>
                )}
              </AnimatePresence>

              {!reveal && known[i] !== undefined && flash !== i && (
                <motion.span className="known-tag" initial={{ scale: 0 }} animate={{ scale: 1 }} title="Chỉ bạn thấy">
                  bạn thấy: <b>{known[i]}</b>
                </motion.span>
              )}
              {isLocked && <span className="lock-tag">Người trước vừa buộc tội — không được xem</span>}

              <AnimatePresence>
                {stamped && isMurderer && (
                  <motion.div
                    className="stamp"
                    initial={{ scale: 3, opacity: 0, rotate: -30 }}
                    animate={{ scale: 1, opacity: 1, rotate: -12 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    Hung thủ
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="chip-stack" style={{ height: 34 + Math.max(0, chips.length - 1) * 7 }}>
                <AnimatePresence>
                  {(resolved ? [] : chips).map((c, k) => (
                    <motion.span
                      key={c.id}
                      layoutId={`chip-${c.id}`}
                      className="stack-chip"
                      style={{ bottom: k * 7, zIndex: k, rotate: ((k * 37) % 13) - 6 }}
                      exit={{ scale: 0.3, opacity: 0, y: 30, transition: { duration: 0.6 } }}
                      transition={{ type: 'spring', stiffness: 170, damping: 20 }}
                      title={nameOf(c.ownerId)}
                    >
                      <ChipFace color={c.color} />
                    </motion.span>
                  ))}
                </AnimatePresence>
                {selected === i && canAccuse && <span className="ghost-chip" />}
              </div>

              {stamped && outcome && (
                <motion.span
                  className={`outcome-tag ${outcome.correct ? 'good' : 'bad'}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {outcome.correct
                    ? `Đúng! ${outcome.chips.length} chip rời khỏi ván`
                    : `${nameOf(outcome.collectorId!)} ôm ${outcome.chips.length} chip phạt`}
                </motion.span>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {reveal && stamped && (
          <motion.div
            className="rule-ribbon"
            initial={{ opacity: 0, scaleX: 0.3 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
          >
            {RULE_TEXT[reveal.rule]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
