# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

This is a realtime online version of Oink Games' deduction game **In a Grove, Revised Edition (2021)**. It has multiplayer rooms for 2–5 players and room chat. The UI and all game text are in Vietnamese. There are three separate npm packages, one each in `server/`, `client/` and `shared/`. `shared/` has no package.json. The root package.json only orchestrates the others, and its `postinstall` installs `server/` and `client/`.

## Commands

```bash
npm install            # root; postinstall installs server/ and client/
npm run dev            # server on :3001 (tsx watch) + Vite on :5173 (proxies /socket.io)
npm test               # vitest, server/src/room.test.ts
npm run typecheck      # tsc for server and client
npm run build          # client → client/dist, server → server/dist/index.js (esbuild bundle)
npm start              # production server; serves client/dist too if it exists
```

To run a single test, use `cd server && npx vitest run -t "enforces the discoverer"`.

The dev server entry is `server/src/dev.ts`. It forces port 3001 even when the shell exports `PORT`, because preview tools set `PORT=5173`. It also disables serving `client/dist`.

## Architecture

- **The server is authoritative and in-memory.** `server/src/room.ts` (`Room`) holds all game state and every rule. It has no socket code, so it can be unit-tested with an injected rng and clock. `server/src/index.ts` is only the Socket.IO transport. Each handler runs a `Room` method, acks `{ok, error}`, and then broadcasts. `GameError` messages are user-facing Vietnamese strings.
- **Views are per player, and secrecy lives on the server.** `room.viewFor(token)` builds a separate `GameView` for each socket. Hidden figure values (other players' hands, unpeeked suspects, the victim) are never sent until `round.reveal` exists. Keep it that way whenever you add fields.
- **Identity:** `token` is a secret stored per tab in the client's `sessionStorage`. `id` is public. Reconnecting with the same token rejoins the same seat. A player who leaves mid-game keeps the seat, which gets a `left:` token, and `Room.tick()` (run every 1 s) auto-plays for them after `AUTOPLAY_AFTER_MS`.
- **Login:** email-code login comes from the shared `oink-kit` package (github:hieunguyen250102/oink-kit). The server mounts `authHandler` (`POST /auth/request`, `/auth/verify`) and `socketAuth`; `room:join` needs a login and `room:create` also needs `canHost` (`HOST_EMAILS`). The seat token above is unchanged: login is only a gate. The client keeps the login in `localStorage` (`grove.session.v1`, see `authClient` in `net.ts`) and sends it in the socket handshake; the store exposes `account`/`login`/`logout`. Without a mail provider outside production, the code is printed on the server and returned as `devCode`. In dev, Vite proxies `/auth` to :3001 too.
- **`shared/`** holds the types and the pure rules (`findMurderer`, `figuresFor`, constants). Both sides import it: the client through the `@shared` alias (vite.config.ts and tsconfig paths), the server through relative paths bundled by esbuild.
- **Client animation choreography** is derived from state, not pushed by the server:
  - `lastAction` (with a `seq`) drives short local effects, such as peek flashes and "X đang xem…" lifts.
  - The reveal is a client-side timeline (`REVEAL` in `client/src/hooks.ts`), keyed off `phase === 'reveal'`. The server resolves the chips immediately. The client hides the new penalty chips (`hiddenPenaltyIds`) until `REVEAL.resolve`.
  - Chips move between the tray, seats, stacks and penalty piles with Framer Motion `layoutId="chip-${chip.id}"`. Chip ids are `${ownerId}:${n}`, and the next unplaced chip is `n = 7 - detective`. Any list that renders chips must reuse this id scheme, and each chip id may appear in only one place.
  - Modals are portalled to `<body>`, because the animated screen wrapper's transform would trap `position: fixed`.
- **Art** is hand-written SVG in `client/src/art/`, redrawn from the print-and-play PNGs in `images/`. All figure backs must stay identical. The style is matte washi paper, navy ink and vermilion (CSS tokens in `client/src/styles.css`). The user explicitly asked for no neon or glow.

## Rules source of truth

Implement the **2021 Revised** rules:

- 2–3 players use no X, 4 players use one X, 5 players use both X.
- A 2-player game has one extra figure face up.
- Each player gets 7 chips.
- Correct accusations remove those chips from the game.
- On each wrong stack, the owner of the top chip takes the whole stack as penalty chips.
- The player with the most penalty chips starts the next case.
- The game ends after a case where someone has 5 or more penalty chips, or someone is out of chips.

`rule_yabunonaka_e.pdf` is the **old 2010** rulebook, with 8 figures, 5 chips, the Tamper marker and an 8-chip loss. Don't take rules from it. `images/00_DOC_TRUOC_KHI_IN.txt` and `images/22_*` describe the revised edition.

## Deploy

- `render.yaml` sets up one Render web service that builds both packages and serves the client.
- `vercel.json` builds only `client/` from the repo root. `VITE_SERVER_URL` must point at the Render URL.
- The server reads `PORT` and `CLIENT_ORIGIN` (a comma-separated CORS allowlist, `*` wildcards allowed; unset allows all origins), plus the login vars `SESSION_SECRET`, `MAIL_RELAY_URL`, `MAIL_RELAY_SECRET` and `HOST_EMAILS`.
- State is in memory, so run a single instance only.
