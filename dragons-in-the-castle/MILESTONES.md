# Development checkpoints

## 1 — Server foundation

- Typed session aggregate includes players, roles, rooms, rounds, secret submissions, results, claims, votes and events.
- D1 migration and version compare-and-swap protect every session update; guest bearer secrets are hashed before identification.
- Server-filtered views, authorization checks, phase/deadline enforcement and deterministic rules are implemented.
- Castle start screen is runnable; gameplay controls remain to be connected.
- Checks: TypeScript passed; local homepage returned HTTP 200. Engine tests and API smoke checks recorded below once run.

Next: playable lobby and reconnect UI, full round UI, PWA and end-to-end checks. Local commits only; no push or deployment.

Milestone 1 verified: 15 engine tests passed; authenticated API creation returned a persistent six-player demo lobby.

## 2 — Lobby and guest flow

Complete: create/join/settings forms, persistent guest identity, polling presence, ready states, privacy cover and reconnect handling.
Checks passed: TypeScript, homepage HTTP 200, four independent API guests joined/readied/reconnected without duplication.
Remaining: round screens, end-to-end gameplay validation, PWA, production build.

## 3 — Complete gameplay loop

Complete: role reveal, illustrated room/action choices, waiting state, private results, editable public claims, secret votes, verdicts, spectators, game-over secrets and replay.
Checks passed: TypeScript; 15 engine tests; 3 live API integration tests covering four guests, concurrent duplicate submissions, hidden information, lying/editing claims, reconnect, both winners, replay, deadlines and stale requests.
Remaining: browser interaction validation, PWA, dependency review and production build.

## 4 — PWA, mobile readiness and final verification

Complete: install manifest and icons; offline reconnect fallback; public-only service-worker cache; static Capacitor-compatible client build; exact-origin native CORS configuration; loading/reconnect states; mobile-first entry order; keyboard labels and privacy dialog; setup and permission-model documentation. Original illustration integrated in the home screen and room cards.

Verification:
- 17 deterministic engine/PWA tests pass, including no private API interception by the service worker.
- 3 live API integration tests pass on development and separately on the built production Worker.
- TypeScript and application lint pass. Starter vendor components are intentionally excluded from lint; portable client image/link rules are documented in README.
- Web and static mobile builds pass. All PWA assets return HTTP 200. Migration generation reports no outstanding schema changes.
- Dependency updates removed 14 original advisories; the resulting install audit reports zero vulnerabilities. The migration tool still reads/generates its schema with the patched esbuild override.
- Browser interaction checks: create demo, readiness, start, role reveal, investigate and guard, blocked-theft result, posting/editing claims, voting, totals, banishment, spectators, game-over history, replay and reload recovery.
- Desktop and 390×844 phone layouts inspected. Privacy cover removes underlying controls from the accessibility tree. Returning between phases scrolls to the primary content.
- WebMCP demo tool verified with a rejected invalid name and successful creation reflected in the visible lobby.
- Fixed duplicate database binding in production output; local production preview applies migrations into separate SQLite storage so it can run beside development safely.

Remaining outside the local MVP: hosted deployment, edge abuse limits/load testing/operations, and native platform packaging/signing/device testing. No push or deployment performed. Development server remains on http://localhost:3000.
