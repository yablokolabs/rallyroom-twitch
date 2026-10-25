# Genuine capture and demo edit

## Current artifacts

A **1:58, 1920×1080 narrated local review** is assembled at `videos/out/rallyroom-local-review.mp4` in the build workspace. It contains actual OBS program output of generated local inputs, a late join, controller pause/resume, architecture, the real main Codex `/status` screen and actual test/commit output. The voice is British female Kokoro bf_emma with a youthful adult delivery direction. Captions use measured audio timing. It has no footer or promotional ending. See [media provenance and reproduction](MEDIA_REVIEW.md).

This is **not the final live Twitch demonstration**. No consenting Twitch channel/app grant was supplied. Generated actions remain explicitly labeled simulation, and narration states the missing live verification. OBS 30.0.2.1 runs on Xvfb and captures headed Chromium via XSHM; the installed package has no native Browser source plugin. No public YouTube upload or challenge submission occurred. Private source and build files stay ignored. The user authorized publishing the reviewed MP4/captions under `docs/media/` and will upload to YouTube themselves. Reviewed evidence frames and edit sources are also public.

## Capture on the consenting workstation

Record locally in OBS before any broadcast/upload. Keep the dashboard key, `.env`, OAuth callback, Twitch developer secret and private usernames off screen. Preserve required Twitch/OBS/Codex provider interface marks; RallyRoom itself has no footer or tool badge.

1. Add the 1920×1080 browser source from the README. Record the actual OBS program output and your test channel's command flow in one clearly attributable source. Test full and compact layout in the actual stream frame; headless screenshots do not verify that.
2. Show `RALLY_MODE=live` and **TWITCH · CONNECTED**. Record real consenting participants typing `!rally join` and selecting roles. Show the resulting route/bridge/beacon changes. State the actual number of people/accounts tested.
3. Record one late join and moderator pause. During pause, a real action must not change progress. Capture a genuine disconnect/reconnect if feasible; retain the visible gap notice and manual resume. Do not stage provider events in the simulator and label them Twitch failures.
4. Record the actual main Codex thread. Run `/status` in its supported interface and show the real session identity. Show the original build prompt, relevant reducer/adapter diff, test output and a real local commit. The session ID already verified through `thread.sessionId` is `01a16f7e-4c97-70f1-81b9-46b2c4e2e308`; the genuine email-redacted screen is now retained at `docs/evidence/codex-status-redacted.png`.
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

Cut idle waiting and label cuts/time compression. End on substantive mission content. No decorative credit strip or promotional ending. The local review has British female narration. The genuine-footage assembly gate remains separate and silent; it cannot certify a simulated review as live evidence. No paid voice plan or unrelated application key was used.

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

Public GitHub source publication was explicitly authorized and completed. A public YouTube upload and challenge submission still require explicit authorization. No public URL or submission receipt exists.
