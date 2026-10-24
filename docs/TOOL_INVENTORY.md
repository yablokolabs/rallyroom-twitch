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
