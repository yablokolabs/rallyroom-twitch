## Inspiration

A chat room can do more together than vote for one option. RallyRoom explores a small cooperative rescue in which one role opens the next role's task. We wanted someone arriving mid-round to understand how to help from the overlay. Streamer and viewer validation is still pending.

## What it does

RallyRoom runs a three-minute mission with scouts, builders and engineers. Exact chat commands reveal a route, build a bridge and power a rescue beacon. The owner controls the mission from an authenticated local dashboard; delegated controllers can pause or resume. A read-only OBS browser page shows progress, time and late-join instructions. Simulation and generated-fixture replay have explicit labels.

The local product works. The read-only Twitch OAuth/EventSub adapter is implemented and tested with mocked provider responses. We have not yet verified real Twitch commands or OBS output on a consenting channel.

## How we built it

We used OpenAI Codex for the application implementation in session `01a16f7e-4c97-70f1-81b9-46b2c4e2e308`, verified from the supported session interface. Codex wrote the pure TypeScript reducer, exact command grammar, clock adapter, OAuth refresh/validation, reconnect handling, local authorization, persistence, React dashboard, illustrated SVG overlay and tests.

The local Node process owns game state and receives Twitch events over an outbound WebSocket. Zod checks input schemas. The server stores a bounded journal with pseudonymous actions and snapshots. The browser receives aggregate state. No runtime LLM or bot chat sending is involved.

## Challenges we ran into

Token identity, chat transport and dashboard permissions need separate checks. We added client/broadcaster/scope validation and numeric controller allowlists instead of trusting names. During review, we caught the cookie mismatch between localhost and 127.0.0.1 in OAuth callbacks and tightened development static serving so private files cannot fall through to the application.

Tests also exposed two mistaken test assumptions: the URL parser normalizes the default secure port, and Node fetch did not send the overridden Host header used in a rebinding test. We corrected the tests to check a nondefault port and use a raw HTTP request. Delayed token-request tests also exposed old requests affecting a newer grant; the checks now cover disconnect and reauthorization while requests remain pending. Videowright's first export failed because its output directory was absent; the render script now creates it.

## Accomplishments that we're proud of

A complete simulated rescue runs through the dashboard and overlay. Automated checks exercise duplicates, cooldowns, prerequisites, small groups, late joining, pause, token refresh/revocation, socket recovery, crash recovery and view-only access. Browser tests capture the simulation at desktop, compact overlay and mobile sizes. A synthetic engine benchmark records deterministic results at 10, 100 and 500 fixture actors; it does not establish Twitch throughput or unique-person fairness.

We created architecture HTML/SVG/PNG using diagram-design and rendered an opening graphic with Videowright. Genuine Twitch/OBS capture and the final ≤3-minute public demo remain unfinished.

## What we learned

An unexpected connection gap has to be visible to players. The game pauses, reconnects and requires the controller to resume; it cannot reconstruct messages Twitch did not deliver. A generated fixture can test that behavior, but only a consenting live session can establish that the integration works with real chat and that viewers understand the game.

## What's next for RallyRoom

Authorize a consenting test channel, run two short rounds and ask the streamer about join clarity, fun and distraction. Record actual Twitch/OBS behavior and the main Codex session, then finish the short demo. Confirm individual eligibility and full challenge rules before submission. No participant study, retention improvement or revenue impact is claimed.
