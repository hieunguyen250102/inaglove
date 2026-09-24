// Dev entry: always listen on 3001 (the Vite proxy target), even if the shell exports PORT.
process.env.PORT = process.env.DEV_SERVER_PORT ?? '3001';
// Don't serve a stale client build in dev; Vite serves the client.
process.env.CLIENT_DIST ??= '/nonexistent';
await import('./index');

export {};
