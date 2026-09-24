import { motion } from 'framer-motion';
import type { GameView } from '@shared/types';
import { ChipFace } from '../art/Chip';
import { Modal } from './Modal';

export function GameOver({ view, onRestart, onLeave }: { view: GameView; onRestart: () => void; onLeave: () => void }) {
  const over = view.gameOver!;
  const me = view.players.find((p) => p.id === view.youId);
  const byId = (id: string) => view.players.find((p) => p.id === id)!;

  return (
    <Modal wide>
      <p className="eyebrow">Hồ sơ khép lại</p>
      <h2 className="modal-title">
        {over.loserId === view.youId ? 'Bạn là thám tử tệ nhất…' : `${byId(over.loserId).name} là thám tử tệ nhất!`}
      </h2>
      <p className="hint center">
        {over.reason === 'penalty' ? 'Có người đã nhận từ 5 chip phạt trở lên.' : 'Mọi thám tử đã dùng hết chip.'} Ít chip
        phạt nhất xếp cao nhất.
      </p>
      <ol className="ranking">
        {over.ranking.map((id, i) => {
          const p = byId(id);
          const loser = id === over.loserId;
          return (
            <motion.li
              key={id}
              className={loser ? 'loser' : i === 0 ? 'winner' : ''}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
            >
              <span className="rank">{i + 1}</span>
              <span className="chip-sm">
                <ChipFace color={p.color} />
              </span>
              <span className="player-name">
                {p.name}
                {id === view.youId && <em> (bạn)</em>}
              </span>
              <span className="penalty-row">
                {p.penaltyChips.map((c) => (
                  <span key={c.id} className="chip-xs">
                    <ChipFace color={c.color} side="back" />
                  </span>
                ))}
                <b>{p.penaltyChips.length}</b>
              </span>
              {loser && (
                <motion.span
                  className="mini-stamp"
                  initial={{ scale: 3, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, opacity: 1, rotate: -10 }}
                  transition={{ delay: 0.3 + over.ranking.length * 0.15, type: 'spring', stiffness: 300, damping: 14 }}
                >
                  Thua
                </motion.span>
              )}
            </motion.li>
          );
        })}
      </ol>
      {view.history.length > 0 && (
        <details className="history">
          <summary>Lịch sử {view.history.length} vụ án</summary>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Hung thủ</th>
                <th>Chip phạt</th>
              </tr>
            </thead>
            <tbody>
              {view.history.map((h) => (
                <tr key={h.number}>
                  <td>{h.number}</td>
                  <td>{h.murdererValue}</td>
                  <td>
                    {Object.entries(h.penalties)
                      .map(([id, n]) => `${byId(id)?.name ?? '?'} +${n}`)
                      .join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onLeave}>
          Rời phòng
        </button>
        {me?.isHost ? (
          <button className="btn btn-primary" onClick={onRestart}>
            Chơi ván mới
          </button>
        ) : (
          <span className="waiting-dots">Chờ chủ phòng mở ván mới</span>
        )}
      </div>
    </Modal>
  );
}
