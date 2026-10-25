# Evidence provenance

| Artifact | What it establishes | What it does not establish |
| --- | --- | --- |
| local-review.json / local-review-frame.png | Exact hash, duration, codecs, capture limitations and a frame from the reviewed MP4 | A live Twitch round or agent YouTube upload |
| codex-status-redacted.png | Actual main Codex CLI `/status`, original session ID, email masked | A recreated UI or new session |
| obs-simulation-success.png | Actual browser frame of the mission recorded by OBS through XSHM; generated actors | Real Twitch chat, viewers or native OBS Browser source |
| codex-session.json | Supported Codex app-server `thread/read` returned the main `sessionId` | A `/status` UI/video capture |
| simulation-dashboard.png | Actual Playwright capture of the running dashboard with synthetic inputs | Live Twitch or OBS |
| simulation-overlay.png / simulation-success.png | Actual browser rendering and state changes in a generated fixture rescue | Broadcast output, real viewers |
| simulation-overlay-compact.png / simulation-mobile.png | Browser layout at 1280×720 / 390px and reduced-motion setting | Readability in an actual stream frame |
| synthetic-evaluation.json | Measured pure-engine workload and final-state hashes with generated actors | Twitch/API/network/storage throughput, human fairness or a participant study |
| production-smoke.json | Production entry/browser startup in three modes; generated replay completes and unconfigured live stays offline | Real Twitch OAuth or OBS execution |
| videowright-intro.png | Frame extracted from an actual Videowright-rendered eight-second title graphic | Gameplay or a completed demo |

Automated tests write only fake identities/keys. No raw Twitch chat, viewer IDs, secret token or actual participant data belongs in these files. Keep source recordings private in ignored videos/media until consent and redaction review. docs/PROGRESS.md remains authoritative.
