import { AnimatePresence, motion } from 'framer-motion';
import { CHIP_COLORS } from '@shared/types';
import { MAX_PLAYERS, MIN_PLAYERS } from '@shared/rules';
import { ChipFace, CHIP_PALETTE } from '../art/Chip';
import { useStore } from '../store';

const X_HINT: Record<number, string> = {
  2: '2 người: dùng quân 2–8, một quân lật ngửa cho cả hai cùng thấy.',
  3: '3 người: dùng quân 2–8, không có X.',
  4: '4 người: thêm một quân X.',
  5: '5 người: thêm cả hai quân X.',
};

export function Lobby() {
  const { view, send, toast } = useStore();
  if (!view) return null;
  const me = view.players.find((p) => p.id === view.youId);
  const isHost = !!me?.isHost;
  const count = view.players.length;
  const link = `${window.location.origin}${window.location.pathname}?phong=${view.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Đã sao chép liên kết mời!', 'info');
    } catch {
      toast(link, 'info');
    }
  };

  return (
    <div className="lobby">
      <motion.section className="panel lobby-code" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow">Mã phòng</p>
        <div className="room-code">
          {view.code.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ delay: 0.1 * i, type: 'spring', stiffness: 200, damping: 14 }}
            >
              {ch}
            </motion.span>
          ))}
        </div>
        <button className="btn btn-secondary" onClick={copy}>
          Sao chép liên kết mời
        </button>
      </motion.section>

      <section className="panel lobby-players">
        <header className="panel-head">
          <h2>Các thám tử</h2>
          <span className="pill">
            {count}/{MAX_PLAYERS}
          </span>
        </header>
        <ul className="player-list">
          <AnimatePresence initial={false}>
            {view.players.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className={p.id === view.youId ? 'is-me' : ''}
              >
                <motion.span className="chip-sm" key={p.color} initial={{ rotateY: 180 }} animate={{ rotateY: 0 }}>
                  <ChipFace color={p.color} />
                </motion.span>
                <span className="player-name">
                  {p.name}
                  {p.id === view.youId && <em> (bạn)</em>}
                </span>
                {p.isHost && <span className="tag">Chủ phòng</span>}
                {!p.connected && <span className="tag tag-muted">mất kết nối</span>}
                {isHost && p.id !== view.youId && (
                  <button className="btn-icon" title="Mời ra" onClick={() => send('lobby:kick', { playerId: p.id })}>
                    ×
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {view.spectators.length > 0 && (
          <p className="hint">Đang xem: {view.spectators.map((s) => s.name).join(', ')}</p>
        )}

        {me && (
          <div className="color-picker">
            <p className="eyebrow">Màu chip của bạn</p>
            <div className="swatches">
              {CHIP_COLORS.map((c) => {
                const takenBy = view.players.find((p) => p.color === c && p.id !== me.id);
                return (
                  <motion.button
                    key={c}
                    whileHover={!takenBy ? { y: -4, rotate: -6 } : undefined}
                    whileTap={!takenBy ? { scale: 0.9 } : undefined}
                    className={`swatch${me.color === c ? ' selected' : ''}`}
                    disabled={!!takenBy}
                    title={takenBy ? `${CHIP_PALETTE[c].name} — ${takenBy.name}` : CHIP_PALETTE[c].name}
                    onClick={() => send('lobby:color', { color: c })}
                  >
                    <ChipFace color={c} />
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        <p className="hint setup-hint">{X_HINT[Math.max(MIN_PLAYERS, count)] ?? ''}</p>
        {isHost ? (
          <button className="btn btn-primary btn-lg" disabled={count < MIN_PLAYERS} onClick={() => send('game:start')}>
            {count < MIN_PLAYERS ? `Cần ít nhất ${MIN_PLAYERS} người` : 'Bắt đầu điều tra'}
          </button>
        ) : (
          <p className="waiting-dots">Chờ chủ phòng bắt đầu</p>
        )}
      </section>
    </div>
  );
}
