# RallyRoom video workspace

Isolated Videowright 0.3.0 project. No application runtime dependencies come from this folder.

```sh
npm ci
npm run typecheck
npm run dev
npm run render:intro
```

The intro is an eight-second authored opening graphic. The demo preview explicitly says genuine capture is pending. Neither is evidence of real Twitch use. See [capture/edit instructions](../docs/DEMO.md).

After reviewed Twitch/OBS and actual Codex recordings exist, prepare `media/manifest.json` from the example and run `npm run assemble`. It creates only a local review MP4 and refuses missing footage or a duration above three minutes. The genuine-footage gate is silent. The separate local review includes narration/captions and explicitly uses simulation. No upload command is present.

Installer source review used scosman/videowright revision df9146f5f8c68d4c67839772419dba96586f007a. The package's suggested Vitest 3 range introduced reported vulnerabilities; this fresh workspace uses patched Vitest 5.0.5 instead. Render and type checks use the installed tools. No global agent configuration changed.

## Narrated local review

The British female local review is separate from the live-footage gate:

```sh
npm run render:review-graphics
npm run render:local-review
```

This requires the actual privately retained OBS/Codex sources and voice WAV/timings described in [MEDIA_REVIEW.md](../docs/MEDIA_REVIEW.md). It produces `out/rallyroom-local-review.mp4`, 118 seconds, with timed captions. It cannot turn missing Twitch footage into live evidence. The final live assembly gate remains unchanged. No upload is performed.
