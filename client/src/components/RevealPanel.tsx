import { motion } from 'framer-motion';
import { figureLabel, RULE_TEXT } from '@shared/rules';
import type { GameView } from '@shared/types';
import { SUSPECT_NAMES } from '../screens/table/Scene';

export function RevealPanel({ view, onContinue, busy }: { view: GameView; onContinue: () => void; busy: boolean }) {
  const reveal = view.round!.reveal!;
  const me = view.players.find((p) => p.id === view.youId);
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';
  const murdererValue = reveal.suspects[reveal.murderer];

  return (
    <motion.div
      className="reveal-panel panel"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -16, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 18 }}
    >
      <div className="reveal-head">
        <span className="reveal-number">{figureLabel(murdererValue)}</span>
        <div>
          <p className="eyebrow">Hung thủ là nghi phạm {SUSPECT_NAMES[reveal.murderer]}</p>
          <p className="reveal-rule">{RULE_TEXT[reveal.rule]}</p>
        </div>
      </div>
      <ul className="reveal-outcomes">
        {reveal.outcomes.length === 0 && <li>Không ai buộc tội.</li>}
        {reveal.outcomes.map((o) => (
          <li key={o.suspect} className={o.correct ? 'good' : 'bad'}>
            <b>Nghi phạm {SUSPECT_NAMES[o.suspect]}</b>{' '}
            {o.correct
              ? `— buộc tội đúng, ${o.chips.length} chip rời khỏi ván.`
              : `— sai! ${nameOf(o.collectorId!)} (chip trên cùng) nhận ${o.chips.length} chip phạt.`}
          </li>
        ))}
      </ul>
      {view.gameOver && <p className="reveal-final">Đã có người chạm giới hạn — ván đấu kết thúc!</p>}
      {me && (
        <div className="reveal-actions">
          <button className="btn btn-primary" disabled={me.continueReady || busy} onClick={onContinue}>
            {me.continueReady ? 'Đang chờ người khác…' : view.gameOver ? 'Xem kết quả chung cuộc' : 'Vụ án tiếp theo'}
          </button>
          <span className="ready-dots">
            {view.players.map((p) => (
              <i key={p.id} className={p.continueReady || !p.connected ? 'ok' : ''} title={p.name} />
            ))}
          </span>
        </div>
      )}
    </motion.div>
  );
}
