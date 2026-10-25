# Evaluation

## Automated checks

76 unit/adapter/API tests passed on 2026-10-25. Production TypeScript + Vite build passed. Generated simulation reached success with 11 resource contributions and 15 accepted inputs. Browser tests passed a full simulated mission, late join, pause/resume, overlay reload, mobile layout and reduced motion. All three browser scenarios now pass, including denial of existing and missing private paths before Vite’s SPA fallback.

Covered: exact ASCII grammar and hostile text; roles/prerequisites; 1/2/3/10/100/500 fixture participants; duplicate delivery/chat IDs; cooldown boundaries; bounded roster/history; moderator restrictions; origin/CSRF/host checks; read-only WebSocket; wrong channel/subscription; stale events; 401 refresh and rotation; revoked refresh; provider revocation; keepalive lapse; reconnect handoff and resubscription; rate-limit reset; crash recovery and truncated journal, interrupted first transaction, replay restart, transactional history clear, late startup cancellation, and preventing delayed OAuth responses from restoring forgotten credentials.

Provider tests use mocked HTTP and fake WebSockets. They do not verify real authorization, delivery latency, token revocation timing or Twitch service behavior. Browser output is not OBS proof.

## Synthetic engine measurement

Measured at 2026-10-24T20:21:17.318Z. AMD EPYC 7452 32-Core Processor; 4 exposed logical CPUs; 15.61 GiB RAM; linux/x64; v22.23.3.

Each sample joins the named number of generated actors, runs the bounded mission, and duplicates each chat event. Timings measure reducer calls in a warm local process. Total throughput includes fixture-loop overhead. No network, disk, browser or Twitch load is involved.

| Fixture actors | Samples | Inputs processed | Inputs/s | p95 reducer ms | Double-counted inputs |
| --- | --- | --- | --- | --- | --- |
| 10 | 20 | 860 | 101,473 | 0.0139 | 0 |
| 100 | 20 | 4460 | 63,188 | 0.0307 | 0 |
| 500 | 20 | 20460 | 17,277 | 0.1606 | 0 |

All samples produced the same public final-state hash per actor count and success with 3/4/4 resource counts. Duplicate-rejection counts match the number of duplicated chat events. Raw measurements and hashes: [synthetic-evaluation.json](evidence/synthetic-evaluation.json). These are microbenchmark observations, not production capacity guarantees.

## Live/pilot evidence

Pending: consenting channel OAuth and real chat ingestion, 2–4-person play if possible, actual OBS program/stream capture, late-join usability, real disconnect/revocation observation and streamer debrief. No participant study or impact metric exists. Record actual account/person count; one test account establishes only its own pipeline behavior.

Production-entry smoke checks loaded dashboard and overlay in simulation, unconfigured live and generated-replay modes with no browser runtime errors. Unauthenticated controls returned 401 in each mode. Generated replay reached success; unconfigured live remained offline. See [production-smoke.json](evidence/production-smoke.json).
