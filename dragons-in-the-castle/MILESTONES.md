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
