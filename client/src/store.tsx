import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ChatMessage, GameView, JoinResult, Reaction } from '@shared/types';
import type { Session as Account, SessionUser } from 'oink-kit/client';
import { authClient, request, socket, storage } from './net';

interface Toast {
  id: number;
  text: string;
  tone: 'error' | 'info';
}

interface Store {
  view: GameView | null;
  chat: ChatMessage[];
  typing: Record<string, { name: string; until: number }>;
  reactions: Reaction[];
  connected: boolean;
  toasts: Toast[];
  /** the email login, or null before signing in */
  account: Account | null;
  login: (account: Account) => void;
  logout: () => void;
  create: (name: string) => Promise<void>;
  join: (code: string, name: string) => Promise<void>;
  leave: () => Promise<void>;
  send: (event: string, payload?: unknown) => Promise<void>;
  toast: (text: string, tone?: Toast['tone']) => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<GameView | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState<Store['typing']>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [connected, setConnected] = useState(socket.connected);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [account, setAccount] = useState<Account | null>(() => authClient.loadSession());
  const toastId = useRef(0);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'error') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const adopt = useCallback((res: JoinResult) => {
    storage.setSession({ code: res.code, token: res.token });
    const url = new URL(window.location.href);
    url.searchParams.set('phong', res.code);
    window.history.replaceState(null, '', url);
  }, []);

  const rejoin = useCallback(async () => {
    const session = storage.session();
    // Without a login the server refuses the seat; keep it and retry once signed in.
    if (!session || !authClient.loadSession()) return;
    try {
      adopt(await request<JoinResult>('room:join', { code: session.code, token: session.token, name: storage.name() || 'Thám tử' }));
    } catch {
      storage.setSession(null);
      setView(null);
    }
  }, [adopt]);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      void rejoin();
    };
    const onDisconnect = () => setConnected(false);
    const onState = (v: GameView) => setView(v);
    const onHistory = (msgs: ChatMessage[]) => setChat(msgs);
    const onMessage = (m: ChatMessage) => {
      setChat((c) => [...c.slice(-150), m]);
      const author = m.playerId;
      if (author) setTyping(({ [author]: _gone, ...rest }) => rest);
    };
    const onTyping = ({ playerId, name }: { playerId: string; name: string }) =>
      setTyping((t) => ({ ...t, [playerId]: { name, until: Date.now() + 3000 } }));
    const onReact = (r: Reaction) => {
      setReactions((list) => [...list, r]);
      setTimeout(() => setReactions((list) => list.filter((x) => x.id !== r.id)), 2400);
    };
    // The server's verdict on our token: drop a stale login, pick up a changed canHost.
    const onSession = ({ user }: { user: SessionUser | null }) => {
      const current = authClient.loadSession();
      if (!current) return;
      if (!user) {
        authClient.saveSession(null);
        setAccount(null);
      } else if (user.canHost !== current.user.canHost) {
        const next = { ...current, user };
        authClient.saveSession(next);
        setAccount(next);
      }
    };
    const onKicked = () => {
      storage.setSession(null);
      setView(null);
      setChat([]);
      toast('Bạn đã bị chủ phòng mời ra.', 'info');
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state', onState);
    socket.on('chat:history', onHistory);
    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    socket.on('react', onReact);
    socket.on('kicked', onKicked);
    socket.on('session', onSession);
    if (socket.connected) void rejoin();
    const sweep = setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        const live = Object.entries(t).filter(([, v]) => v.until > now);
        return live.length === Object.keys(t).length ? t : Object.fromEntries(live);
      });
    }, 1000);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state', onState);
      socket.off('chat:history', onHistory);
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      socket.off('react', onReact);
      socket.off('kicked', onKicked);
      socket.off('session', onSession);
      clearInterval(sweep);
    };
  }, [rejoin, toast]);

  const store = useMemo<Store>(
    () => ({
      view,
      chat,
      typing,
      reactions,
      connected,
      toasts,
      toast,
      account,
      login: (next) => {
        authClient.saveSession(next);
        setAccount(next);
        // reconnect so the server sees the new token
        socket.disconnect().connect();
      },
      logout: () => {
        authClient.saveSession(null);
        setAccount(null);
        socket.disconnect().connect();
      },
      create: async (name) => {
        storage.setName(name);
        adopt(await request<JoinResult>('room:create', { name }));
      },
      join: async (code, name) => {
        storage.setName(name);
        const session = storage.session();
        const token = session?.code === code.toUpperCase() ? session.token : undefined;
        adopt(await request<JoinResult>('room:join', { code, name, token }));
      },
      leave: async () => {
        await request('room:leave').catch(() => {});
        storage.setSession(null);
        setView(null);
        setChat([]);
        const url = new URL(window.location.href);
        url.searchParams.delete('phong');
        window.history.replaceState(null, '', url);
      },
      send: async (event, payload) => {
        try {
          await request(event, payload);
        } catch (e) {
          toast((e as Error).message);
          throw e;
        }
      },
    }),
    [view, chat, typing, reactions, connected, toasts, toast, adopt, account],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
