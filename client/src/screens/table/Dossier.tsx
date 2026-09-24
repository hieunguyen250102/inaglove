import { AnimatePresence, motion } from 'framer-motion';
import { CHIPS_PER_PLAYER, figuresFor } from '@shared/rules';
import type { FigureValue, GameView } from '@shared/types';
import { ChipFace } from '../../art/Chip';
import { FigureFront } from '../../art/Figure';
import { SUSPECT_NAMES } from './Scene';

interface DossierProps {
  view: GameView;
  selected: number | null;
  onAccuse: () => void;
  busy: boolean;
}

export function Dossier({ view, selected, onAccuse, busy }: DossierProps) {
  const round = view.round!;
  const me = view.players.find((p) => p.id === view.youId);
  const priv = view.private;
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';

  if (!me || !priv) {
    return (
      <div className="dossier panel spectator-note">
        <p>
          Bạn đang <b>xem</b> ván này. Bạn sẽ được vào chơi ở ván sau nếu còn chỗ. Cứ thoải mái trò chuyện nhé!
        </p>
      </div>
    );
  }

  const myTurn = round.currentPlayerId === view.youId;
  const peeked = round.peekedThisTurn.length;
  const placed = CHIPS_PER_PLAYER - me.detective;

  // What the notebook knows: innocents you've seen and suspects you've looked at.
  const alibis: { v: FigureValue; note: string }[] = [
    { v: priv.hand, note: 'quân của bạn' },
    { v: priv.alibi, note: `của ${nameOf(priv.alibiFromId)}` },
  ];
  if (round.faceUp !== null) alibis.push({ v: round.faceUp, note: 'lật ngửa' });
  const suspects = Object.entries(priv.known).map(([s, v]) => ({ s: Number(s), v }));
  // Each figure in play is matched against at most one fact (two X figures can both be known).
  const notebook = figuresFor(view.players.length).map((v) => {
    const a = alibis.findIndex((x) => x.v === v);
    if (a >= 0) return { v, alibi: alibis.splice(a, 1)[0].note, suspect: undefined };
    const s = suspects.findIndex((x) => x.v === v);
    if (s >= 0) return { v, alibi: undefined, suspect: suspects.splice(s, 1)[0].s };
    return { v, alibi: undefined, suspect: undefined };
  });

  let instruction: string;
  if (view.phase === 'alibi') instruction = 'Đang kiểm tra chứng cứ ngoại phạm…';
  else if (view.phase === 'reveal') instruction = 'Sự thật đang được phơi bày…';
  else if (!myTurn) instruction = `${nameOf(round.currentPlayerId ?? '')} đang điều tra. Quan sát kỹ họ xem nghi phạm nào!`;
  else if (peeked < 2)
    instruction =
      round.turnIndex === 0
        ? `Bạn là người đi đầu: chọn 2 trong 3 nghi phạm để xem (${peeked}/2).`
        : `Xem 2 nghi phạm mà người trước không buộc tội (${peeked}/2).`;
  else if (selected === null) instruction = 'Chọn một nghi phạm để đặt chip buộc tội. Bạn có thể tố cáo cả người chưa xem — hoặc lừa người khác!';
  else instruction = `Buộc tội nghi phạm ${SUSPECT_NAMES[selected]}?`;

  return (
    <div className={`dossier panel${myTurn ? ' my-turn' : ''}`}>
      <div className="dossier-files">
        <p className="eyebrow">Hồ sơ của bạn</p>
        <div className="evidence">
          <figure>
            <div className="evidence-fig">
              <FigureFront value={priv.hand} />
            </div>
            <figcaption>Quân của bạn</figcaption>
          </figure>
          <figure>
            <div className="evidence-fig">
              <FigureFront value={priv.alibi} />
            </div>
            <figcaption>Từ {nameOf(priv.alibiFromId)}</figcaption>
          </figure>
        </div>
      </div>

      <div className="notebook">
        <p className="eyebrow">Sổ tay</p>
        <ul className="notebook-list">
          {notebook.map((n, i) => (
            <li key={i} className={n.alibi ? 'cleared' : n.suspect !== undefined ? 'suspect' : ''} title={n.alibi ?? ''}>
              <span className="nb-value">{n.v}</span>
              <span className="nb-note">
                {n.alibi ? 'ngoại phạm' : n.suspect !== undefined ? `nghi phạm ${SUSPECT_NAMES[n.suspect]}` : '?'}
              </span>
            </li>
          ))}
        </ul>
        <p className="rule-mini">
          Số lớn nhất là hung thủ · Có <b className="red">5</b> → số nhỏ nhất · <b>X</b> luôn vô tội
        </p>
      </div>

      <div className="dossier-actions">
        <AnimatePresence mode="wait">
          <motion.p
            key={instruction}
            className="instruction"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {instruction}
          </motion.p>
        </AnimatePresence>
        <div className="tray">
          {Array.from({ length: me.detective }, (_, k) => {
            const id = `${me.id}:${placed + k}`;
            return (
              <motion.span
                key={id}
                layoutId={`chip-${id}`}
                className={`tray-chip${k === 0 && myTurn && peeked >= 2 ? ' ready' : ''}`}
                style={{ zIndex: me.detective - k }}
                whileHover={{ y: -6 }}
              >
                <ChipFace color={me.color} />
              </motion.span>
            );
          })}
          <span className="tray-count">{me.detective} chip thám tử</span>
        </div>
        {myTurn && peeked >= 2 && (
          <motion.button
            className="btn btn-primary btn-lg"
            disabled={selected === null || busy}
            onClick={onAccuse}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
          >
            {selected === null ? 'Chọn nghi phạm…' : `Buộc tội nghi phạm ${SUSPECT_NAMES[selected]}`}
          </motion.button>
        )}
      </div>
    </div>
  );
}
