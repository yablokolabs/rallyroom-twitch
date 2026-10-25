# Genuine capture and demo edit

## Current artifacts

The application and automated browser captures work in simulation. `videos/out/intro.mp4` is a locally rendered **8.000-second, 1920×1080 H.264 opening graphic** created with Videowright 0.3.0; it contains no gameplay evidence. A frame is retained at `docs/evidence/videowright-intro.png`. The final Twitch/OBS/Codex demo has not been assembled, uploaded or published.

The build host has no OBS or graphical display. No consenting Twitch channel/app credentials or genuine source recordings have been supplied. Do not replace these with generated events, browser screenshots, transcript recreations or an animation labeled live.

## Capture on the consenting workstation

Record locally in OBS before any broadcast/upload. Keep the dashboard key, `.env`, OAuth callback, Twitch developer secret and private usernames off screen. Preserve required Twitch/OBS/Codex provider interface marks; RallyRoom itself has no footer or tool badge.

1. Add the 1920×1080 browser source from the README. Record the actual OBS program output and your test channel's command flow in one clearly attributable source. Test full and compact layout in the actual stream frame; headless screenshots do not verify that.
2. Show `RALLY_MODE=live` and **TWITCH · CONNECTED**. Record real consenting participants typing `!rally join` and selecting roles. Show the resulting route/bridge/beacon changes. State the actual number of people/accounts tested.
3. Record one late join and moderator pause. During pause, a real action must not change progress. Capture a genuine disconnect/reconnect if feasible; retain the visible gap notice and manual resume. Do not stage provider events in the simulator and label them Twitch failures.
4. Record the actual main Codex thread. Run `/status` in its supported interface and show the real session identity. Show the original build prompt, relevant reducer/adapter diff, test output and a real local commit. The session ID already verified through `thread.sessionId` is `01a16f7e-4c97-70f1-81b9-46b2c4e2e308`; no `/status` screenshot exists yet.
5. Save original source files under ignored `videos/media/`. Keep a private consent note and capture timestamps. Place sanitized observations in `docs/evidence/` only after review. Do not put raw chat, viewer IDs or credential screens into the repository.

## Edit plan: 165 seconds

| Time | Content | Evidence required |
| --- | --- | --- |
| 0–8 | Videowright opening: rescue roles and purpose | Authored graphic, already rendered |
| 8–28 | Local setup and OBS source | Genuine workstation capture |
| 28–98 | Chat commands changing the shared mission | Genuine Twitch + OBS recording |
| 98–123 | Late joining, pause, connection recovery | Actual observed behavior |
| 123–153 | Main Codex thread, `/status`, diff, checks | Actual Codex interface recording |
| 153–165 | Return to mission recap and explain limits/run path | Genuine recap, short captions |

Cut idle waiting and label cuts/time compression. End on substantive mission content. No decorative credit strip or promotional ending. Audio preference is pending; current tooling supports a captions-only silent assembly. No paid voice plan, narration API or unrelated key has been used.

## Isolated video workflow

```sh
cd videos
npm ci
npm run typecheck
npm run dev
npm run render:intro
```

`videowright.config.ts` and `styles/rallyroom/` define the project. The `demo` preview contains a conspicuous missing-footage card and is **not** a submission video. The `intro` timeline exports only the eight-second opening. Videowright's render clock does not control autoplay video, so this project uses Videowright for authored graphics and FFmpeg for deterministic trimming/assembly of actual recordings. This division is disclosed rather than claiming that live footage passed through an unsupported renderer path.

After genuine capture:

1. Copy `media-manifest.example.json` to `media/manifest.json`; set actual filenames, offsets and durations. Review consent, session evidence and private-data removal before setting its verification fields.
2. Burn accurate captions into source clips with your local editor, or extend the edit with your confirmed narration choice. The current assembly path strips source audio so it cannot accidentally publish background chat/music. Do not call an uncaptioned assembly final.
3. Run `npm run assemble`. It refuses missing/unreviewed sources, clip ranges beyond source duration, unsafe filenames and a total over 180 seconds. Output is local `out/rallyroom-review.mp4`; the script never uploads it.
4. Inspect the entire export, verify duration with `ffprobe`, check consent/redactions/readability and confirm the final story matches observed behavior. Preserve a private original and an edit manifest.

Publishing a public YouTube demo, sharing source externally and challenge submission each still require explicit authorization. No public URL or submission receipt exists.
