import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FigureValue } from '@shared/types';
import { AlibiOverlay } from '../../components/AlibiOverlay';
import { GameOver } from '../../components/GameOver';
import { RevealPanel } from '../../components/RevealPanel';
import { REVEAL, useElapsed, useMediaQuery } from '../../hooks';
import { useStore } from '../../store';
import { Dossier } from './Dossier';
import { Scene } from './Scene';
import { Seat } from './Seat';

export function Table() {
  const { view, send, leave } = useStore();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [lifted, setLifted] = useState<Record<number, string>>({});
  const [yourTurnCue, setYourTurnCue] = useState(0);
  const small = useMediaQuery('(max-width: 720px)');
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSeq = useRef(view!.lastAction.seq);

  const v = view!;
  const round = v.round!;
  const revealT = useElapsed(v.phase === 'reveal', `reveal-${round.number}`, REVEAL.end);
  const myTurn = v.phase === 'investigate' && round.currentPlayerId === v.youId;
  const nameOf = (id: string) => v.players.find((p) => p.id === id)?.name ?? '';

  // Turn server "last action" events into local, short-lived animations.
  useEffect(() => {
    const a = v.lastAction;
    if (a.seq === lastSeq.current) return;
    lastSeq.current = a.seq;
    if (a.type === 'peek') {
      if (a.playerId === v.youId) {
        setFlash(a.suspect);
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 2200);
      } else {
        const who = nameOf(a.playerId);
        setLifted((l) => ({ ...l, [a.suspect]: who }));
        setTimeout(() => setLifted(({ [a.suspect]: _done, ...rest }) => rest), 1700);
      }
    }
    if (a.type === 'accuse' || a.type === 'roundStart') {
      setSelected(null);
      setLifted({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.lastAction.seq]);

  useEffect(() => {
    if (myTurn) setYourTurnCue((n) => n + 1);
  }, [myTurn, round.number]);

  const act = async (event: string, payload?: unknown) => {
    setBusy(true);
    try {
      await send(event, payload);
    } catch {
      /* toast already shown */
    } finally {
      setBusy(false);
    }
  };

  const peekable = useMemo(() => {
    if (!myTurn || round.peekedThisTurn.length >= 2) return [];
    return [0, 1, 2].filter(
      (s) => !(round.turnIndex > 0 && s === round.lockedSuspect) && !round.peekedThisTurn.includes(s),
    );
  }, [myTurn, round]);
  const accusable = myTurn && round.peekedThisTurn.length >= 2;

  const hiddenPenaltyIds = useMemo(() => {
    if (v.phase !== 'reveal' || revealT >= REVEAL.resolve) return new Set<string>();
    return new Set(round.stacks.flat().map((c) => c.id));
  }, [v.phase, revealT, round.stacks]);

  const statusFor = (id: string): string | null => {
    const p = v.players.find((x) => x.id === id)!;
    if (v.phase === 'alibi') return p.alibiReady ? 'đã ghi nhớ' : 'xem ngoại phạm…';
    if (v.phase === 'reveal') return p.continueReady ? 'sẵn sàng' : null;
    if (v.phase !== 'investigate') return null;
    const idx = round.turnOrder.indexOf(id);
    if (idx === round.turnIndex) return round.peekedThisTurn.length < 2 ? `đang xem ${round.peekedThisTurn.length}/2` : 'đang cân nhắc…';
    return idx < round.turnIndex ? 'đã buộc tội' : 'chờ lượt';
  };

  const handFor = (id: string): { value: FigureValue | null; up: boolean } => {
    if (v.phase === 'reveal' && round.reveal) return { value: round.reveal.hands[id], up: revealT >= REVEAL.hands };
    if (!v.private) return { value: null, up: false };
    if (id === v.youId) return { value: v.private.hand, up: true };
    if (id === v.private.alibiFromId) return { value: v.private.alibi, up: true };
    return { value: null, up: false };
  };

  let status: string;
  if (v.phase === 'alibi') status = 'Kiểm tra chứng cứ ngoại phạm';
  else if (v.phase === 'investigate')
    status = myTurn ? 'Đến lượt bạn điều tra' : `${nameOf(round.currentPlayerId ?? '')} đang điều tra`;
  else if (v.phase === 'reveal') status = revealT < REVEAL.stamp ? 'Lật mặt sự thật…' : 'Phán quyết';
  else status = 'Hồ sơ khép lại';

  return (
    <div className="table">
      <div className="table-status">
        <span className="case-no">Vụ án #{round.number}</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={status}
            className="status-text"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {status}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="seats">
        {v.players.map((p) => {
          const hand = handFor(p.id);
          const orderIdx = round.turnOrder.indexOf(p.id);
          return (
            <Seat
              key={p.id}
              player={p}
              isMe={p.id === v.youId}
              isCurrent={round.currentPlayerId === p.id}
              isDiscoverer={round.discovererId === p.id}
              turnNo={v.phase === 'investigate' || v.phase === 'alibi' ? orderIdx + 1 : null}
              status={statusFor(p.id)}
              handValue={hand.value}
              handRevealed={hand.up}
              hiddenPenaltyIds={hiddenPenaltyIds}
              showChips={p.id !== v.youId || !v.private}
            />
          );
        })}
      </div>

      <div className="board-wrap">
        <Scene
          view={v}
          revealT={revealT}
          flash={flash}
          lifted={lifted}
          peekable={peekable}
          accusable={accusable}
          selected={selected}
          figureSize={small ? 62 : 92}
          onPeek={(s) => act('game:peek', { suspect: s })}
          onSelect={setSelected}
        />
        <AnimatePresence>
          {yourTurnCue > 0 && myTurn && (
            <motion.div
              key={yourTurnCue}
              className="turn-cue"
              initial={{ opacity: 0, scaleX: 0.2, rotate: -3 }}
              animate={{ opacity: [0, 1, 1, 0], scaleX: [0.2, 1, 1, 1], rotate: -3 }}
              transition={{ duration: 1.8, times: [0, 0.15, 0.8, 1] }}
            >
              Đến lượt bạn!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {v.phase === 'reveal' && revealT >= REVEAL.panel ? (
          <RevealPanel key="verdict" view={v} busy={busy} onContinue={() => act('game:continue')} />
        ) : (
          <motion.div key="dossier" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <Dossier
              view={v}
              selected={selected}
              busy={busy}
              onAccuse={() => selected !== null && act('game:accuse', { suspect: selected })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {v.phase === 'alibi' && v.private && (
          <AlibiOverlay key={`alibi-${round.number}`} view={v} busy={busy} onReady={() => act('game:alibiReady')} />
        )}
        {v.phase === 'gameover' && (
          <GameOver key="over" view={v} onRestart={() => act('game:restart')} onLeave={() => void leave()} />
        )}
      </AnimatePresence>
    </div>
  );
}
