import { motion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { TitleArt } from '../art/GroveBackdrop';
import { FigureFront } from '../art/Figure';
import { ChipFace } from '../art/Chip';
import { storage } from '../net';
import { useStore } from '../store';

export function Home({ onRules }: { onRules: () => void }) {
  const { create, join, connected, toast } = useStore();
  const [name, setName] = useState(storage.name());
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get('phong')?.toUpperCase() ?? '');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    if (!name.trim()) return toast('Hãy nhập tên thám tử của bạn.');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 4) return toast('Mã phòng gồm 4 chữ cái.');
    void run(() => join(code.trim(), name.trim()));
  };

  return (
    <div className="home">
      <motion.div
        className="home-hero"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <TitleArt />
        <div className="home-cast" aria-hidden>
          {[3, 5, 8].map((v, i) => (
            <motion.div
              key={v}
              className="home-cast-figure"
              initial={{ y: 60, opacity: 0, rotate: (i - 1) * 8 }}
              animate={{ y: 0, opacity: 1, rotate: (i - 1) * 4 }}
              transition={{ delay: 0.4 + i * 0.15, type: 'spring', stiffness: 120, damping: 12 }}
            >
              <FigureFront value={v} />
            </motion.div>
          ))}
          <motion.div
            className="home-cast-chip"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1, type: 'spring', stiffness: 200, damping: 10 }}
          >
            <ChipFace color="red" />
          </motion.div>
        </div>
        <p className="home-blurb">
          Một vụ án trong rừng tre. Ba nghi phạm, một hung thủ. Mỗi thám tử chỉ biết một phần sự thật. Suy luận,
          quan sát người khác và đừng để bị buộc tội sai!
        </p>
      </motion.div>

      <motion.div
        className="panel home-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
      >
        <label className="field">
          <span>Tên thám tử</span>
          <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="VD: Kanazawa" autoFocus />
        </label>
        <button className="btn btn-primary btn-lg" disabled={busy || !connected} onClick={() => run(() => create(name.trim()))}>
          Mở vụ án mới
        </button>
        <div className="divider">
          <span>hoặc vào phòng có sẵn</span>
        </div>
        <form className="join-row" onSubmit={onJoin}>
          <input
            className="code-input"
            value={code}
            maxLength={4}
            placeholder="MÃ"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            aria-label="Mã phòng"
          />
          <button className="btn btn-secondary" disabled={busy || !connected} type="submit">
            Vào phòng
          </button>
        </form>
        <button className="btn-link" onClick={onRules}>
          Xem luật chơi
        </button>
        {!connected && <p className="hint">Đang kết nối tới máy chủ… (máy chủ miễn phí có thể mất ~30 giây để thức dậy)</p>}
      </motion.div>
    </div>
  );
}
