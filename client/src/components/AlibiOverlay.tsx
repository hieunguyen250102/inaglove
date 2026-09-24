import { motion } from 'framer-motion';
import type { GameView } from '@shared/types';
import { FlipFigure } from '../art/Figure';
import { useElapsed } from '../hooks';
import { Modal } from './Modal';

/** The alibi check, staged: see your figure → pass it right → receive one from the left. */
export function AlibiOverlay({ view, onReady, busy }: { view: GameView; onReady: () => void; busy: boolean }) {
  const t = useElapsed(true, `alibi-${view.round!.number}`, 4000);
  const priv = view.private!;
  const players = view.players;
  const myIdx = players.findIndex((p) => p.id === view.youId);
  const passTo = players[(myIdx - 1 + players.length) % players.length];
  const from = players.find((p) => p.id === priv.alibiFromId)!;
  const me = players[myIdx];
  const twoPlayer = players.length === 2;

  const step = t < 900 ? 0 : t < 2300 ? 1 : t < 3100 ? 2 : 3;

  return (
    <Modal>
      <p className="eyebrow">Vụ án #{view.round!.number}</p>
      <h2 className="modal-title">Kiểm tra chứng cứ ngoại phạm</h2>
      <div className="alibi-stage">
        <div className="alibi-slot">
          <motion.div
            animate={step >= 2 ? { x: 160, opacity: 0, rotate: 12 } : { x: 0, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 15 }}
          >
            <FlipFigure value={priv.hand} faceUp={step >= 1} size={96} />
          </motion.div>
          <p className="alibi-caption">
            {step < 2 ? (
              <>
                Quân của bạn: <b>{priv.hand}</b>
              </>
            ) : (
              <>
                Đã chuyền <b>{priv.hand}</b> cho {twoPlayer ? from.name : passTo.name} →
              </>
            )}
          </p>
        </div>
        <div className="alibi-slot">
          <motion.div
            initial={{ x: -160, opacity: 0, rotate: -12 }}
            animate={step >= 2 ? { x: 0, opacity: 1, rotate: 0 } : undefined}
            transition={{ type: 'spring', stiffness: 90, damping: 15 }}
          >
            <FlipFigure value={priv.alibi} faceUp={step >= 3} size={96} />
          </motion.div>
          <p className="alibi-caption">
            {step >= 3 ? (
              <>
                Nhận từ {from.name}: <b>{priv.alibi}</b>
              </>
            ) : (
              ' '
            )}
          </p>
        </div>
      </div>
      <p className="hint center">
        Hai quân này có chứng cứ ngoại phạm — chúng <b>không</b> nằm trong ba nghi phạm.
        {view.round!.faceUp !== null && (
          <>
            {' '}
            Thêm vào đó, quân <b>{view.round!.faceUp}</b> lật ngửa cho cả hai cùng thấy.
          </>
        )}
      </p>
      {me.alibiReady ? (
        <div className="ready-list">
          <p className="waiting-dots">Chờ các thám tử khác</p>
          <ul>
            {players.map((p) => (
              <li key={p.id} className={p.alibiReady ? 'ok' : ''}>
                {p.alibiReady ? '✓' : '…'} {p.name}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button className="btn btn-primary btn-lg" disabled={step < 3 || busy} onClick={onReady}>
          Đã ghi nhớ
        </button>
      )}
    </Modal>
  );
}
