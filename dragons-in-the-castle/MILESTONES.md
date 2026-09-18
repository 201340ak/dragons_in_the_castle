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

Milestones 1–2 publication verified: Sites version 5 deployed successfully to the existing public URL. All four API regression tests also pass on the hosted service. A separate hosted two-round smoke test verified a 2–5 theft range, an explicit four-coin theft from a five-coin room, then a forced one-coin remainder and successful final theft. Both implementation commits are pushed to GitHub. Existing hosted sessions were retained; no database reset was performed. Windows hosting wrappers required the established npm build and shared prepare-site-build.cjs/native tar fallback.

## Gameplay revision — Milestone 3
Complete: accessible Discussion/My claim tabs with parent-owned drafts, ready-to-vote control with undo, shared ready counts, claims required for readiness, posted edits clear readiness, bots auto-ready and spectators excluded. Timers remain the fallback for missing players.
Checks: TypeScript, lint and 27 engine/PWA tests. Remaining: live anonymous voting, mobile verification and deployment.
Future consideration: timed-out seats, removal and bot replacement when leaving, with explicit session/identity rules; no behavior changed in this release.

## Gameplay revision — Milestone 4
Complete: anonymous tentative and locked vote counts, changeable intentions before locking, immutable locked votes, visible counts for locked players and spectators, Skip counts, no default choice, and circular candidate avatars. Legacy sessions tolerate missing vote intentions.
Checks: TypeScript, lint, 29 engine/PWA tests, 5 production-runtime API tests, web/mobile builds, and 390×844 browser checks pass. Phone checks verify draft preservation, readiness, initial unselected voting, tentative counts and circular avatars. API checks cover undo, early advancement, concurrent counts, locking and stale submissions.
Remaining: push both milestones, deploy and verify hosted API behavior.

Milestones 3–4 publication verified: Sites version 6 deployed successfully to the existing public URL. All five hosted API integration tests pass, including reversible readiness, early advancement, anonymous intention counts, locking, reconnect and stale-write rejection. Both implementation commits are pushed to GitHub. No database reset or schema change was needed. Deployment source tree was verified identical to the committed app tree before saving; an empty intermediate source snapshot was corrected before any version was saved or deployed. Remaining: future leaving/session options, account management and optional untimed play are deferred.

## Castle table — Milestone 1
Complete: replaced editable name autocomplete with a required native dropdown. Valid saved selections are restored; saved custom names require a fresh selection. Existing session identities are unchanged.
Checks: TypeScript and lint pass. Remaining: illustrated castle board, action-card flow, browser checks and requested publication.

## Castle table — Milestone 2
Complete: reusable dollhouse room board with original illustrated interiors, connected room layout, custom room-label/count support, private local portrait position, round-stage track and role objective. Board inputs deliberately exclude other players' destinations and room totals.
Checks: TypeScript/lint pass; browser verified strict dropdown, bot creation and five-room board at 390×844. Remaining: persistent map while choosing action cards, confirmed sealing animation, regression checks and deployment.

## Castle table — Milestone 3
Complete: selection is now a persistent private board with tap-to-choose destinations and illustrated action cards. No default room/action is sealed accidentally. The local portrait moves between doorway positions; room changes retain the chosen action. Dragon amount bounds remain enforced. Successful server acceptance triggers a brief face-down-card animation, including immediate-resolution bot rounds; reduced-motion skips the animation delay. Pending/confirmed submissions disable edits and repeated sends; rejected requests retain editable choices. Reconnecting restores the confirmed destination and sealed card. Round results/discussion/voting retain their existing screens.
Checks: TypeScript, lint, 29 engine/PWA tests, web and mobile builds pass. At 390×844, verified dropdown restoration, room/card selection, changing destination, sealing, six-of-seven waiting, refresh recovery and final-human resolution. Original generated room/action sprite sheets are local bundled assets; no external image dependencies.
Remaining: production API regression checks, push/deploy and hosted verification. Resolution choreography and moving coin tokens remain Milestone 4; broader polish remains Milestone 5.

Castle table Milestones 1–3 publication verified: all three implementation commits were pushed to GitHub and Sites version 7 deployed successfully to the existing public URL. Five production-runtime API tests passed before publication; all five hosted API tests passed on September 15, completing the interrupted release verification. No database reset or schema change was required. Requested scope is complete. Milestone 4 (resolution choreography and moving coin tokens) and Milestone 5 (broader interaction polish) remain future work.

## Castle table — Milestone 4
Complete: private result board with a 2.4-second begin/impact/settled sequence, successful-theft coin denominations moving toward the local portrait, blocked/quiet guard feedback, counted totals and anonymous investigation findings. Skip and immediate discussion controls never change the server deadline. Initial restored results are settled; animation starts only from a live selection-to-results transition. Typed presentation cues provide an optional future audio subscriber; this release creates no audio.
Checks: TypeScript/lint and 33 engine/PWA/resolution tests pass, including exact animated theft denominations and irreversible skip/reduced-motion settlement.
Remaining: Milestone 5 layout/accessibility/reconnect polish and final build/API validation. No push or deployment requested for these milestones.

## Castle table — Milestone 5
Complete: larger readable card labels, 48px primary controls, narrow-screen card/clue layouts, scalable room geometry, light-theme contrast, static result-map semantics and focused skip destination. Reduced-motion changes and privacy cover permanently settle the current sequence. Fresh game identity is part of the round component key. Reconnects, restored snapshots, repeated polls, near-expired result phases and immediate wins bypass new animation playback. Future sound integration is documented; no audio is enabled.
Checks: TypeScript/lint, 34 engine/PWA/resolution tests, five production-runtime API tests and final web/mobile builds pass. Development homepage returned HTTP 200. This turn did not include browser visual/interaction QA; timing and privacy behavior have automated coverage, while final visual feel still needs a playthrough.
Remaining: visual playthrough feedback and any subsequently requested release. Both milestones are committed locally; no push or deployment was requested or performed. Hosted version 7 is unchanged.

Castle table Milestones 4–5 publication verified: pushed both implementation commits to GitHub and deployed Sites version 8 to the existing public URL on September 16. All five hosted multiplayer API regression tests pass. Existing database and access settings were preserved. Visual playthrough remains unperformed; this release reuses the previously validated web/mobile builds and 34 passing automated tests.

## Accounts — Milestone 1
Implemented and published: Supabase email-link sign-in with same-browser PKCE, protected account cookies, session refresh, sign-out, account name and built-in portrait. Guest game identity remains independent; hosting does not yet require an account. Email delivery intentionally uses Supabase's default sender for the owner's test account. Email codes, custom SMTP, Google/Facebook and account-based hosting authorization remain later milestones.

Checks: 47 automated tests, TypeScript, lint, web/mobile builds and five local multiplayer API checks passed before release. GitHub implementation commit a6fed07 was pushed; Sites version 9 deployed September 18. All five hosted multiplayer checks plus anonymous account status, cross-origin mutation rejection and invalid callback rejection passed. No database migration/reset or audience change was required.

Remaining verification: the owner must request a real email link and open it in the same browser, then save a profile and sign out. No real email delivery or authenticated browser profile flow has yet been verified. Pause here before beginning the next feature milestone.

## Round table — Milestone 1
Complete: renamed the discussion phase in the interface to Round table, added anonymous skeptical/interesting/believable/funny reaction counts, one changeable/removable reaction per active player per other player's claim, read-only counts after discussion and for spectators. Claim edits clear reactions and invalidate stale reaction requests. Individual reaction identities are excluded even from the endgame history.
Checks: TypeScript, lint and 49 automated tests pass. Remaining: untimed host settings and advancement, runtime integration tests and final builds. The owner reports email sign-in working and has pivoted back to gameplay.

## Round table — Milestone 2
Complete: timed/no-timer selection in host settings, optional host advancement disabled by default, no countdown for untimed Round tables, waiting-player names and offline indicators, and a confirmation before the host starts voting early. Untimed play waits for every active human's claim and readiness; bots and spectators do not block it. Claim editing still clears readiness. Disconnected humans retain their seats. Selection and voting keep their timers. Existing saved games remain timed. Bot-game phase skipping cannot bypass untimed readiness settings.
Checks: TypeScript, lint, 53 automated tests, web/mobile builds and six local production-runtime API integration tests pass. Tests cover multi-day restoration, simultaneous anonymous counts, stale claim/phase requests, host permissions and guest multiplayer regressions. Local homepage returns HTTP 200. No browser interaction/visual QA was performed. No database migration is required.
Remaining: optional visual playthrough and requested publication. Both gameplay milestones are committed locally; this gameplay request did not include pushing or deployment. Hosted version 9 remains the account release.
