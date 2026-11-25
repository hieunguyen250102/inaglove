import { motion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { TitleArt } from '../art/GroveBackdrop';
import { FigureFront } from '../art/Figure';
import { ChipFace } from '../art/Chip';
import { useEmailLogin } from 'oink-kit/react';
import { roomCodeInput, type Session as Account } from 'oink-kit/client';
import { authClient, storage } from '../net';
import { useStore } from '../store';

export function Home({ onRules }: { onRules: () => void }) {
  const { create, join, connected, toast, account, login, logout } = useStore();
  const [name, setName] = useState(storage.name());
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get('phong')?.toUpperCase() ?? '');
  const [busy, setBusy] = useState(false);
  // Only the host logs in. Also reopened when the mail app reloaded the tab mid-login.
  const [hostLogin, setHostLogin] = useState(() => !!authClient.loadPendingLogin());

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
        {hostLogin && !account ? (
          <LoginForm
            onLogin={login}
            onCancel={() => {
              authClient.savePendingLogin(null);
              setHostLogin(false);
            }}
          />
        ) : (
          <>
            {account && (
              <div className="account">
                <span>{account.user.email}</span>
                <button className="btn-link" onClick={logout}>
                  Đăng xuất
                </button>
              </div>
            )}
            <label className="field">
              <span>Tên thám tử</span>
              <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="VD: Kanazawa" autoFocus />
            </label>
            {account?.user.canHost ? (
              <>
                <button className="btn btn-primary btn-lg" disabled={busy || !connected} onClick={() => run(() => create(name.trim()))}>
                  Mở vụ án mới
                </button>
                <div className="divider">
                  <span>hoặc vào phòng có sẵn</span>
                </div>
              </>
            ) : (
              <p className="hint">Nhập mã phòng mà chủ phòng gửi cho bạn để vào vụ án.</p>
            )}
            <form className="join-row" onSubmit={onJoin}>
              <input
                className="code-input"
                value={code}
                maxLength={4}
                placeholder="MÃ"
                // roomCodeInput undoes Vietnamese Telex rewrites, e.g. a lone "w" turning into "ư"
                onChange={(e) =>
                  setCode(roomCodeInput(e.target.value, code, 4, e.target.selectionStart).replace(/[^A-Z]/g, ''))
                }
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="Mã phòng"
              />
              <button className="btn btn-secondary" disabled={busy || !connected} type="submit">
                Vào phòng
              </button>
            </form>
            {!account && (
              <button className="btn-link" onClick={() => setHostLogin(true)}>
                Bạn là chủ phòng? Đăng nhập để mở vụ án
              </button>
            )}
          </>
        )}
        <button className="btn-link" onClick={onRules}>
          Xem luật chơi
        </button>
        {!connected && <p className="hint">Đang kết nối tới máy chủ… (máy chủ miễn phí có thể mất ~30 giây để thức dậy)</p>}
      </motion.div>
    </div>
  );
}

/** Email → 6-digit code. The behaviour lives in oink-kit's useEmailLogin; this is only the grove's look. */
function LoginForm({ onLogin, onCancel }: { onLogin: (account: Account) => void; onCancel: () => void }) {
  const login = useEmailLogin(authClient, { onLogin });
  const { email, code, busy, error, notice, devCode, cooldown } = login;

  if (login.step === 'email') {
    return (
      <form
        className="login"
        onSubmit={(e) => {
          e.preventDefault();
          void login.send();
        }}
      >
        <p className="hint">Chỉ chủ phòng cần đăng nhập để mở vụ án. Nhập email, chúng tôi sẽ gửi cho bạn một mã 6 số.</p>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            placeholder="ban@vidu.com"
            onChange={(e) => login.setEmail(e.target.value)}
            autoFocus
          />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={!login.emailOk || busy}>
          {busy ? 'Đang gửi…' : 'Gửi mã đăng nhập'}
        </button>
        <button type="button" className="btn-link" onClick={onCancel}>
          ← Quay lại, tôi chỉ vào phòng
        </button>
      </form>
    );
  }

  return (
    <form
      className="login"
      onSubmit={(e) => {
        e.preventDefault();
        void login.verify();
      }}
    >
      <p className="hint">
        Đã gửi mã tới <b>{email.trim()}</b>. Xem cả thư mục Spam nếu chưa thấy.
      </p>
      <input
        ref={login.codeRef}
        className="code-input otp"
        value={code}
        onChange={(e) => login.typeCode(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="••••••"
        aria-label="Mã 6 số"
        autoFocus
      />
      {devCode && (
        <p className="hint">
          Máy chủ chưa cấu hình gửi mail (chế độ dev), mã là{' '}
          <button type="button" className="btn-link" onClick={() => void login.verify(devCode)}>
            {devCode}
          </button>
        </p>
      )}
      {notice && !error && <p className="hint">{notice}</p>}
      {error && <p className="login-error">{error}</p>}
      <button type="submit" className="btn btn-primary btn-lg" disabled={code.length !== 6 || busy}>
        {busy ? 'Đang kiểm tra…' : 'Xác nhận'}
      </button>
      <div className="login-links">
        <button type="button" className="btn-link" onClick={login.changeEmail}>
          ← Đổi email
        </button>
        <button type="button" className="btn-link" disabled={cooldown > 0 || busy} onClick={() => void login.send()}>
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
        </button>
      </div>
    </form>
  );
}
