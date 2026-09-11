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

## 5 — Compact player controller

Complete: single-column game surface, persistent room/phase/timer, bottom drawers for players/private results/rules, accessible modal controls, privacy cover unmounts drawers, retained castle palette and illustration.
Checks: TypeScript, lint, all 17 engine/PWA tests pass.
Remaining: simplify entry and selection flow; validate web/mobile builds. No push or deployment.

## 6 — Fast entry and focused choices

Complete: direct name/code join form, secondary hosting with optional settings, short demo entry, two-step room/action selection with change-room control, compact touch targets, and private-drawer screen cover. Existing claims, voting, replay, and game rules remain available.

Checks: TypeScript and lint; 17 engine/PWA tests; 3 live API integration tests; web and static mobile builds; local homepage HTTP 200. Browser checked at 390×844: entry, demo lobby, ready/start, room selection, action selection, seal and private result, private info drawer, and screen cover/return during phase advancement. The privacy cover removes both drawer and underlying game controls from the accessibility tree. Corrected stretched radio indicators found during visual inspection.

Remaining: user feedback on the new interaction design; hosted deployment and native packaging remain outside this local milestone. No push or deployment.

## 7 — Secret review and publication preparation

Complete: fetched GitHub refs, Gitleaks full-history scan of six commits (no findings), historical sensitive-file inventory and ignore checks, documented review scope, registered the existing app for Sites hosting with its D1 binding.
Checks: TypeScript, lint, 17 engine/PWA tests and production build pass.
Remaining: upload exact source/build, publish the working prototype and verify the hosted API. Local databases and scanner reports are excluded.

## 8 — Hosted prototype

Complete: published the full Worker and static assets through Sites with a fresh managed D1 database and public link. A separate app-root source snapshot preserves the existing GitHub repository layout and history. On Windows, used the packaging helper's own prepare-site-build.cjs validator plus native tar because Bash is unavailable; archive includes exactly one migration tree and no local database files.

Checks: hosted homepage returns HTTP 200; all three live API tests pass against the published URL, covering private roles, concurrent submissions, claims, voting, replay, both winning paths, deadlines, and stale requests. Gitleaks scan of the exact publication source also reports no leaks.

Remaining outside this demonstration release: stronger edge abuse controls, retention/cleanup, broader load testing, and native packaging. Public URL: https://dragons-in-the-castle.alexisdawnkennedy.chatgpt.site

## Gameplay revision — Milestone 1
Complete: configurable minimum/maximum theft, Dragon amount selection (disabled when only one amount remains), server-side amount validation, randomized scarce-coin priority, and fixed 1/2/3 Dragon allocation. Legacy sessions/clients retain a fixed theft fallback; existing roles are unchanged. Room bounds are exposed only to active Dragons during selection.
Checks: TypeScript, lint, 23 engine/PWA tests pass. Remaining: selection-completion regression tests, snapshot ordering, production checks and requested deployment.

## Gameplay revision — Milestone 2
Complete: explicit all-submitted/deadline selection gate, sealed-choice progress screen, single-resolution guard, monotonic server revisions to reject outdated client snapshots, and lazy normalization of legacy saved settings without changing existing roles.
Checks: 25 engine/PWA tests and 4 production-runtime API tests pass, including a delayed human entering the investigator's room, mixed bots/humans, concurrent actions, deadline handling, frozen results and reconnects. TypeScript/lint and web/mobile builds pass. The existing selection gate already prevented early results; bots submit immediately, so a solo demo can legitimately resolve immediately. No evidence of premature calculation was reproduced with human clients.
Remaining: publish and verify the same tests on the hosted service. Discussion tabs/readiness and live voting are outside these two milestones.
