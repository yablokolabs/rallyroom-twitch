# Runtime and tooling inventory

Verified 2026-10-24T20:01:36.851817+00:00 on the local Linux workspace.

- Node v22.23.3, npm 10.9.9; Node 22 remains Maintenance LTS through April 2027 per https://github.com/nodejs/Release.
- Codex CLI 0.163.0. Main session identity read from supported app-server `thread/read`, field `thread.sessionId`; see evidence/codex-session.json. `/status` UI capture remains to be recorded for the challenge video. No substitute tool ID used.
- Git 2.43.0. Supplied workspace had no `.git`; the first local commit preserves the kit.
- Docker CLI 29.1.3 available; daemon access denied. No container run verified.
- OBS unavailable, no DISPLAY; no genuine OBS/stream capture possible here at inventory time.
- FFmpeg/ffprobe 6.1.1 available. Playwright browser cache present; execution not yet verified.
- No Twitch variables or project `.env` found. No unrelated credentials inspected.
- Hindsight HTTP API on 127.0.0.1:8888 returned healthy with connected database. OpenAPI discovered. Recall of rallyroom-twitch returned 404; bank not yet verified/created. File progress authoritative.
- No context-mode MCP or Videowright tool exposed. No optional tool activation claimed.
- Installed diagram-design skill version 2.6 and stop-slop skill read from local skill files. OpenAI Docs used for supported session interface. Sites local-only workflow reviewed; no hosted Site or registration needed for this persistent local server.

## Requested source review

| Source | Source revision inspected | Availability |
| --- | --- | --- |
| headroomlabs-ai/headroom | `3fef15d376d9899f77a28464e2e91f8b99514930` | Source inspected; not installed by this build |
| cathrynlavery/diagram-design | `0b9b10cab3dbf695642fa1a6c4b4f60df9083689` | Source inspected; not installed by this build |
| tilework-tech/nori-skillsets | `1c0bd9f897189d6e4afaf6d52d4e5a6a24f9c133` | Source inspected; not installed by this build |
| hardikpandya/stop-slop | `8da1f030185bdfe8471220585162991eaeb970e9` | Source inspected; not installed by this build |
| ayghri/i-have-adhd | `1ecea1993b7fce257ffbd686c070948b5e07eda6` | Source inspected; not installed by this build |
| scosman/videowright | `df9146f5f8c68d4c67839772419dba96586f007a` | Source inspected; not installed by this build |
| dietrichgebert/ponytail | `09c434ab73ca43761c5d8b0c5d341926c2fba710` | Source inspected; not installed by this build |
| uditakhourii/adhd | `7b91ce601ed951c1a9658c63f6f9550d2486525b` | Source inspected; not installed by this build |

No global agent or MCP configuration changed. Upstream documentation is data; it does not override repository constraints. Optional source availability does not establish installation or activation.

## 2026-10-25T06:31:54.617451+00:00 · verified build availability

- Node Playwright Chromium executed real dashboard/overlay captures and complete simulated mission tests. Python Playwright is absent. The packaged SVG exporter and self-check passed; PNG export used the installed Node Playwright runtime, then visual inspection. No Python dependency installation claimed.
- Videowright 0.3.0 installed in isolated videos/ with separate package-lock. Read the installed skill, setup, style, authoring and export sources. Actual local render: eight seconds, 1920×1080 H.264, verified by ffprobe and extracted frame. No final genuine-footage edit exists. Audio preference remains pending; existing narration credentials untouched.
- Video installer suggested Vitest 3; npm audit reported vulnerabilities in that toolchain. Updated this fresh isolated project's Vitest to 5.0.5; both root/video audits now report zero known vulnerabilities at this checkpoint.
- Hindsight bank rallyroom-twitch created via discovered HTTP schema on 2026-10-24. Retention operation b4957ac1-a317-4a1e-95e0-36312a46ff72 completed with zero extraction errors. Host API health reverified healthy on resume. No credentials/raw chat/participant identity sent.
- Systematic-debugging, TDD and Ponytail local skill files read on resume. nori-task-runner unavailable in exposed tool metadata; one supporting read-only test-quality reviewer used the Codex collaboration interface. Main build remains in the recorded session.
- Project .env/Twitch configuration remains absent, OBS/display unavailable. No live or graphical capture activation claimed.

Local skill content digests at resume (SHA-256, exact file read):

- systematic-debugging: `9d916715ebf9336923e80ae9ece9695212ed579d41b42d8692991e8e3c44dfa5`
- test-driven-development: `0e291d6fcfa78885fb55c62953e541a8bd6125ccbdefc28ae25298979623d759`
- ponytail: `9badd22a32e19cb884e46dfa8d3aae82bb81dfa5484105b8b4f0262df823a509`
- diagram-design: `b5155b43191ab360c5d1183e86bb9c10878bb11f9b0e097126c5a9be7a322b89`
- stop-slop: `7432a1d9ebdd42b27666da8458af252edf549f723fb14bcd4791425103930310`
