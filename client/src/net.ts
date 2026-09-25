import { io } from 'socket.io-client';
import { createAuthClient } from 'oink-kit/client';

/**
 * VITE_SERVER_URL points the client at the Socket.IO server (e.g. your Render URL)
 * when the client is hosted elsewhere (Vercel). Unset = same origin (dev proxy / single service).
 */
const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, '') || undefined;

/** Email login (shared with the other Oink games); the token rides on every socket handshake. */
export const authClient = createAuthClient({ storagePrefix: 'grove', serverUrl: SERVER_URL ?? '' });

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnectionDelayMax: 4000,
  auth: authClient.socketAuth,
});

export async function request<T = unknown>(event: string, payload?: unknown): Promise<T> {
  const res = await socket.timeout(10_000).emitWithAck(event, payload ?? {});
  if (!res?.ok) throw new Error(res?.error ?? 'Có lỗi xảy ra.');
  return res.data as T;
}

const SESSION_KEY = 'grove:session';
const NAME_KEY = 'grove:name';

export interface Session {
  code: string;
  token: string;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// sessionStorage keeps one seat per tab, so several tabs can play in one browser while testing.
export const storage = {
  session: (): Session | null => safe(() => JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null'), null),
  setSession: (s: Session | null) =>
    safe(() => (s ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)) : sessionStorage.removeItem(SESSION_KEY)), undefined),
  name: () => safe(() => localStorage.getItem(NAME_KEY) ?? '', ''),
  setName: (n: string) => safe(() => localStorage.setItem(NAME_KEY, n), undefined),
};
