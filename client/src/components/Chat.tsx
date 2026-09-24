import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { REACTIONS } from '@shared/types';
import { CHIP_PALETTE } from '../art/Chip';
import { socket } from '../net';
import { useStore } from '../store';

export function Chat() {
  const { chat, view, typing, send } = useStore();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const lastTyping = useRef(0);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chat]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    await send('chat:send', { text: t }).catch(() => setText(t));
  };

  const onType = (v: string) => {
    setText(v);
    const now = Date.now();
    if (now - lastTyping.current > 1500) {
      lastTyping.current = now;
      socket.emit('chat:typing');
    }
  };

  const typers = Object.entries(typing)
    .filter(([id]) => id !== view?.youId)
    .map(([, t]) => t.name);

  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        <AnimatePresence initial={false}>
          {chat.map((m) =>
            m.kind === 'system' ? (
              <motion.p key={m.id} className="chat-system" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {m.text}
              </motion.p>
            ) : (
              <motion.div
                key={m.id}
                className={`chat-msg${m.playerId === view?.youId ? ' mine' : ''}`}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <span className="chat-name" style={{ color: m.color ? CHIP_PALETTE[m.color].dark : undefined }}>
                  {m.color && <i className="dot" style={{ background: CHIP_PALETTE[m.color].base }} />}
                  {m.name}
                </span>
                <span className="chat-text">{m.text}</span>
              </motion.div>
            ),
          )}
        </AnimatePresence>
      </div>
      <div className="chat-typing">{typers.length > 0 && <span>{typers.join(', ')} đang nhập…</span>}</div>
      <div className="reaction-bar">
        {REACTIONS.map((r) => (
          <motion.button
            key={r}
            whileHover={{ scale: 1.25, rotate: -8 }}
            whileTap={{ scale: 0.8 }}
            onClick={() => socket.emit('react', { emoji: r })}
            aria-label={`Thả cảm xúc ${r}`}
          >
            {r}
          </motion.button>
        ))}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input value={text} maxLength={280} onChange={(e) => onType(e.target.value)} placeholder="Nói gì đó… (hoặc lừa ai đó)" />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>
          Gửi
        </button>
      </form>
    </div>
  );
}
