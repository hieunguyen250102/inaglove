import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { GroveBackdrop } from './art/GroveBackdrop';
import { Chat } from './components/Chat';
import { RulesModal } from './components/RulesModal';
import { useMediaQuery } from './hooks';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { Table } from './screens/table/Table';
import { useStore } from './store';

export function App() {
  const { view, connected, toasts, leave, chat } = useStore();
  const [rules, setRules] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [seenTs, setSeenTs] = useState(() => Date.now());
  const wide = useMediaQuery('(min-width: 1100px)');
  const inRoom = !!view;
  const inGame = inRoom && view.phase !== 'lobby';
  const screen = !view ? 'home' : view.phase === 'lobby' ? 'lobby' : 'table';

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  const unread = chatOpen ? 0 : chat.filter((m) => m.kind === 'chat' && m.playerId !== view?.youId && m.ts > seenTs).length;
  const toggleChat = (open: boolean) => {
    setChatOpen(open);
    setSeenTs(Date.now());
  };

  const onLeave = () => {
    if (!inGame || view.youAreSpectator || window.confirm('Rời ván đang chơi? Lượt của bạn sẽ được chơi tự động.')) void leave();
  };

  return (
    <MotionConfig reducedMotion="user">
      <GroveBackdrop dense={!inRoom} />
      <div className={`app${inRoom ? ' in-room' : ''}`}>
        {inRoom && (
          <header className="topbar">
            <span className="brand">
              In a Grove <small>Trong lùm cây</small>
            </span>
            <span className="topbar-code" title="Mã phòng">
              {view.code}
            </span>
            <span className="topbar-actions">
              <button className="btn btn-ghost" onClick={() => setRules(true)}>
                Luật
              </button>
              <button className="btn btn-ghost" onClick={onLeave}>
                Rời phòng
              </button>
            </span>
          </header>
        )}

        <main className="app-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              className="screen"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              {screen === 'home' ? <Home onRules={() => setRules(true)} /> : screen === 'lobby' ? <Lobby /> : <Table />}
            </motion.div>
          </AnimatePresence>
        </main>

        {inRoom && wide && (
          <aside className="chat-col panel">
            <h3 className="chat-title">Trò chuyện</h3>
            <Chat />
          </aside>
        )}
      </div>

      {inRoom && !wide && (
        <>
          <motion.button
            className="chat-fab"
            onClick={() => toggleChat(true)}
            whileTap={{ scale: 0.9 }}
            aria-label="Mở trò chuyện"
          >
            💬
            {unread > 0 && (
              <motion.span className="badge" key={unread} initial={{ scale: 1.6 }} animate={{ scale: 1 }}>
                {unread}
              </motion.span>
            )}
          </motion.button>
          <AnimatePresence>
            {chatOpen && (
              <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => toggleChat(false)}>
                <motion.div
                  className="chat-sheet panel"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sheet-head">
                    <h3 className="chat-title">Trò chuyện</h3>
                    <button className="modal-close" onClick={() => toggleChat(false)} aria-label="Đóng">
                      ×
                    </button>
                  </div>
                  <Chat />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <AnimatePresence>{rules && <RulesModal onClose={() => setRules(false)} />}</AnimatePresence>

      <AnimatePresence>
        {inRoom && !connected && (
          <motion.div className="conn-banner" initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }}>
            Mất kết nối — đang kết nối lại…
          </motion.div>
        )}
      </AnimatePresence>

      <div className="toasts">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.tone}`}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
