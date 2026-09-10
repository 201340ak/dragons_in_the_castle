# Dragons in the Castle

## Hosted prototype

Open https://dragons-in-the-castle.alexisdawnkennedy.chatgpt.site in a phone or desktop browser. Enter a name and choose **Play with bots** to play with five computer-controlled companions. Tap **I'm ready**, then **Start the game**. During a bot game, **More → Finish this phase** advances the clock. For multiplayer, the host creates a room, can add bots to fill empty seats, and shares its code; each human player opens the same website on their own device.

The link is public and requires no account. Hosted games use a separate managed D1 database; local test databases were not uploaded. This is a prototype for demonstrations, not a hardened public service. See SECURITY-REVIEW.md for the pre-publication secret review.

A local, playable 4–12 player social-deduction MVP. React 19 + TypeScript + Tailwind + Base UI/shadcn, served by Vinext (Next.js-compatible) and a Cloudflare Worker. D1/SQLite is the authoritative persistent store. No Supabase account or external credentials are needed locally.

## Run locally

Use Node 24 and npm. From this directory:

```sh
npm ci
npm run db:migrate
npm run dev -- --host 0.0.0.0
```

Open http://localhost:3000. Enter a name and create a castle, join with a code, or choose **Play with bots**. Hosts can add or remove bots in the lobby, allowing one to three humans to fill the remaining seats. Bot play starts with five named companions; ready yourself and start. Bot-game controls advance the current phase without waiting. Bots use only information available to their role and employ varied, deterministic strategies; they do not model advanced human strategy.

For four local human-controlled players, use separate browser profiles/private contexts or devices. Tabs in the same browser profile deliberately share one guest identity. Refreshing or rejoining the same code restores the same player. Clearing site storage loses that identity; there is no identity recovery by display name.

Devices must reach the same server. Phone access over a LAN also needs a secure origin (HTTPS) for Web Crypto, installation and service workers; localhost is trusted on the machine running the browser. The local development server is not an internet deployment.

## Checks

```sh
npm test                 # Deterministic rules and privacy tests
npm run typecheck
npm run test:api         # Requires the local dev server on port 3000
npm run build            # Worker + browser production bundles
npm run build:mobile     # Static client bundle for later Capacitor packaging
npm audit
```

`TEST_URL` can target another local production preview for API tests. Tests create isolated synthetic sessions. D1 data lives under ignored `.wrangler/state`; it survives process restarts. `db/schema.ts` and the generated immutable `drizzle/` migrations are checked in. Use `npx drizzle-kit generate` after intentional schema changes.

## Rules and authority

- `lib/engine.ts` holds typed Sessions, Players, Roles, Rooms, Rounds, Choices, Results, Claims, Votes and Events. Each session is one aggregate stored in SQLite as JSON, not a browser-local game.
- `lib/store.ts` commits each operation with `UPDATE ... WHERE version = ?`. Concurrent requests retry from the committed state; only one resolution and one sealed submission can commit.
- A device generates a 256-bit cryptographic bearer identity. The server hashes it with SHA-256. Raw bearer secrets are never stored in game records, placed in URLs, or sent to other players.
- Every request requires membership except explicit create/join. The host is identified from stored membership, not a client-supplied host flag. Phase, round, deadline, active status, role and duplicate checks happen server-side.
- `view()` explicitly constructs each player's response. Other roles, actions, results, room gold and vote choices are absent until authorized. Dragons receive only fellow Dragon names. Public claims are unvalidated fiction or truth.
- One-second authenticated polling provides shared phase updates and presence (15-second grace). Each request advances expired phases atomically. With no connected players, the stored deadline is reconciled on the next request; no client can extend it.
- Missed selections mean no entry/action; missed votes mean no vote. Neither lowers the strict-majority threshold. Private results and verdicts have short review timers and can advance when all active humans acknowledge. Discussion always runs until its deadline in real games.
- Actions resolve before voting; stealing the last coins ends the game immediately. Banishment only reveals roles if configured, or when the game ends. Replay clears all old roles and rounds and requires readiness again.

## PWA and native packaging

The manifest includes 192/512px icons and standalone display. The service worker caches **only public artwork, icons, manifest and offline fallback**. It never caches the API, authorization-bearing requests, secret snapshots or RSC payloads. Multiplayer requires connectivity; offline navigation displays a reconnect screen.

The UI has a separate static build (`dist-mobile/index.html`) with no server engine. `capacitor.config.ts` points at that output. When native packaging is requested:

1. Set build-time `VITE_API_BASE_URL` to the trusted HTTPS game backend.
2. Configure the backend `ALLOWED_ORIGINS` with the exact native app origins; no wildcard CORS is enabled. For local native development typical origins are `capacitor://localhost` and `http://localhost`.
3. Build the mobile client, add Capacitor platform packages, and run native project sync/build with the respective iOS/Android SDKs.

No native platform projects, app-store signing, hosted backend, push or deployment have been created. Hosting and device-specific native testing remain future work requiring the user's instruction. Before internet launch, configure edge abuse limits, operational monitoring, backup/retention and load testing for the expected session count. The tested scope here is the complete local MVP, not an audited large-scale service.

## Layout and access

Mobile layouts put entry controls first, use large touch targets and keyboard-operable selection primitives. **Hide screen** covers the view and makes the underlying page inert, including for assistive technology; switching away covers it automatically. Claims render as text, never HTML. Game-over chronicles expose all actual actions, theft outcomes, votes and final coins.

`MILESTONES.md` records checked checkpoints. All commits are local and authored as Codex because this repository initially had no Git author configuration.

Production preview: after building, run `npm start -- --port 3001`. The preview applies migrations automatically into .wrangler/preview-state so the development and production processes do not contend for the same SQLite files.

Lint checks application code. The unmodified starter component catalog and its helper are excluded; framework-only image/link rules are disabled because this UI is also built as a static Capacitor client.
