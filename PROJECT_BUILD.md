# RallyRoom — implementation specification

## Product and judging
A streamer launches a three-minute cooperative mission. Viewers use a few chat commands to reveal a route, build a bridge and power a rescue beacon. Each role changes shared world state; people arriving mid-round see a compact catch-up card and can help immediately. One bounded mission with team roles is the MVP, not generic polling or another example chatbot.

Innovation hypothesis: visible interdependent contributions and late-join context make a stronger cooperative experience than one-command majority votes. Do not claim unprecedented invention. Impact: entertainment and a low-friction way to participate without a separate viewer account. Technical execution: robust Twitch events, replayable state and verified Codex build evidence. Design: readable at stream scale, accessible cues and short commands. No numerical judging weights provided.

## Gameplay contract
Map: three route nodes plus exit, one bridge and beacon. Commands: `!rally join`, `!rally role scout|builder|engineer`, `!rally scout`, `!rally build`, `!rally charge`, `!rally help`. Default role allocation least-filled; explicit changes restricted during a short cooldown. Streamer control is separate dashboard, never arbitrary user chat command.

State machine lobby → running → success/timeout → recap → reset. Start/reset/pause streamer-authorized. Scouts reveal route (3 accepted actions), builders bridge it (4), engineers charge beacon (4). For one/two-viewer mode allow role switching; scale thresholds only at round start using documented participant count, never silently penalize joiners. These are configurable initial design values, not user-tested balance.

One accepted action per participant per 5 seconds, no resource for paid/subscriber status and no money/prizes/betting. A required action outside current phase gives private dashboard/overlay help rather than chat spam. Late joiners get current objective, their useful action and remaining time. Aggregate contributions rather than displaying raw chat. Display names optional/sanitized and disabled in public proof unless consented. No gameplay based on inferred personal/demographic traits.

Clock uses authoritative server monotonic elapsed time; pause freezes game timer and rejects gameplay commands. Each accepted event has eventId, roundId, actorId pseudonym, command, server sequence and timestamp. Deduplicate provider message/event identities before effects, with bounded retention. Reject events from wrong channel, prior round or nonjoined participant. Whitelisted syntax, length/rate bounds and Unicode handling; no arbitrary name-to-command matching. Engine is pure reducer plus clock adapter, separate from transport.

## Architecture and startup
TypeScript; maintained Node LTS verified at build time; React/Vite dashboard + canvas/SVG game overlay; lightweight HTTP + WebSocket server; Zod validation; local SQLite or append-only bounded event store. Lock compatible versions after reading official docs. Persistent local process connects outbound to Twitch EventSub; OBS opens local overlay page. No Twitch tokens in browser/overlay URL. No persistent EventSub connection in an unverified serverless function.

```text
apps/web/src/{dashboard,overlay,onboarding}
apps/server/src/{auth,twitch,controls,rooms,storage}
packages/game/src/{schema,reducer,clock,commands,balance}
fixtures/{events,scenarios}
tests/{engine,adapter,api,e2e}
scripts/{evaluate,smoke}
docs/{PROGRESS,CODEX_BUILD_LOG,TWITCH_SETUP,EVALUATION,DEMO}.md
```

Implement/test npm run dev, npm test, npm run test:e2e, npm run simulate and production build/run scripts. Commands are requirements, not currently supported. Overlay route read-only. Dashboard bound loopback by default with session/CSRF checks for state changes; explicitly protect any remote control exposure. Validate websocket origin and per-room subscription; view clients cannot inject game events. Multiple-process/cloud deployment is stretch work requiring a single-authority state coordinator.

## Twitch integration discovery
Follow official current chat and EventSub docs. Verify app client ID, redirect URI, account identity and least-privilege read-chat authorization for chosen local user-token architecture. Do not copy all scopes from a send-enabled chatbot example. Record exact scope/consent relationships, subscription condition/version and expiry/refresh behavior in docs/TWITCH_SETUP.md. App secret and tokens untracked/server-side. Use supported OAuth flow, validate returned identity/scopes and avoid tokens in URLs/logs/screenshots. Never assume app token alone provides read-chat access.

Subscribe only to required chat event for authorized consenting test channel. Separate app OAuth from EventSub session and from game room. Follow documented welcome/subscription lifecycle, keepalive and reconnect behavior. Deduplicate deliveries and surface transport status. On unexpected gap freeze the game and show reconnecting; do not invent missed chat or claim full replay recovery. Recover authoritative local game state; handle provider revocation with explicit reconnect/reauthorization. Verify channel/chat permission before allowing session start. No optional bot responses, chat moderation actions or Extension review dependency in MVP.

## Persistence, replay and failure behavior
Persist round config, accepted action log and snapshots without full raw chat history. Apply transactional/serialized acceptance so concurrent commands cannot double-spend a cooldown or phase threshold. Crash recovery loads snapshot and sequence; don't restore stale running timer silently—require streamer resume. Overlay reconnect gets full snapshot plus sequence; reject out-of-order incremental state.

Simulation input bypasses Twitch only through a visibly separate development adapter, unavailable on production public write paths. Replay banner remains visible; never backfill unobserved events. Configurable retention with a clear local clear-history action; logs contain operational errors not OAuth headers or full chat. No proof artifact includes private user IDs/raw tokens.

## Visual direction and accessibility
Bright rescue diorama or clean illustrated map, midnight-blue panels with orange/aqua/gold role accents matched to branding. Role labels/icons/text beyond color, reduced-motion mode, readable objective/countdown, sound-off comprehension and accessible dashboard controls. Overlay at 1920x1080 plus compact safe-area layout; check readability inside actual streamed frame. No footer or badges. Loading/offline/revoked status is substantive UI, not hidden.

## Verification
Engine: deterministic replay, prerequisites, role changes, small-group balance, no action while paused, duplicate deliveries, cooldown boundaries, round reset and monotonic clock. Adapter: malformed payload, wrong channel, unknown command, auth failure, expired/revoked token, keepalive lapse, reconnect and event-gap status. API: unauthorized controls, view-only websocket, origin/CSRF protections and secret redaction. Browser: lobby → join → roles → success/timeout, late-join help, reconnect snapshot and reduced motion.

Measure actual processed throughput/latency with synthetic load at 10/100/500 actor fixtures, labeling hardware, sample counts and simulation. This does not establish Twitch throughput or unique-person fairness. Target zero double-counted events and deterministic final state. Perform a real authorized Twitch round with 2–4 consenting viewers if possible; if only one test account, disclose that limitation and demonstrate real command pipeline plus labeled synthetic stress tests. Record OBS/stream output, not only localhost UI. No platform impersonation, unsolicited chat traffic or testing in someone else's channel.

## Milestones and priorities
Planning estimate 35–50 focused hours. Oct 24 M0 3–5h: Codex identity, Twitch app/auth, engine scaffold. Oct 25–26 M1 8–10h: reducer/simulation/overlay. Oct 27–28 M2 10–14h: real authorized Twitch + controls/recovery. Oct 29–30 M3 8–12h: test session, UX/failure proof. Oct 31–Nov 1 M4 6–9h: architecture/demo/source package and claims review. Deadline Nov 2 22:00 UTC / Nov 3 03:30 IST. Cut maps, cosmetics, public hosting and runtime AI before cutting genuine integration, test evidence or Codex use.

## Codex evidence
Keep one main Codex build thread. Capture real session ID with supported session UI/status; `/status` specified in supplied brief. Log selected prompts, changed files, test outputs and milestones; redact private paths/secrets before demo. Describe actual assistance: reducer construction, reconnect debugging, tests, UI iteration—only after executed. A chat planning the kit is not automatically the thread where most application work occurred. No fabricated ID or claims that CSCS compatibility equals Codex development.

## Submission and pilot
Repo includes all code/assets/run instructions; public recommended after secret/license review, private permitted per brief with supported judge sharing. Demo public YouTube <=3 minutes, both actual Twitch gameplay and Codex contribution. Write a seven-heading story and actual Built With. Individually enter subject to rules; do not declare company as entrant. Full rules inaccessible here; confirm country, age, timing and stage/travel requirements before finalizing. Do not guarantee travel reimbursement or stage selection.

Pilot with one consenting small streamer: one setup session, two short rounds and a debrief on join clarity, fun and distraction. Record observed participation with consent, never claim retention/revenue improvement without study. Add no viewer payments or unsupported moderation services. No runtime AI is necessary and no unrelated existing API keys need inspection.
