# Narrated local review

`videos/out/rallyroom-local-review.mp4` is a 118-second local review, 1920×1080,
H.264/AAC, with British female narration and timed subtitles. It is explicitly
simulation. Genuine authorized Twitch commands, a consenting channel test,
native OBS Browser source verification and the final live demo remain pending.
The user authorized pushing this reviewed video/captions to the public repository and will handle YouTube upload. The public copy is `docs/media/rallyroom-local-review.mp4`; captions are alongside it. No agent YouTube upload or challenge submission occurred.

## What was actually captured

- OBS Studio 30.0.2.1 / obs-websocket 5.3.4 recorded headed Chromium on an isolated
  Xvfb display with XSHM, software llvmpipe rendering and a 30 fps output setting.
  The installed OBS package has no Browser source plugin. Generated actors
  completed the 3/4/4 mission, with a late join and controller pause/resume.
  The source is 73.800 seconds. Software rendering dropped frames; this capture
  is functional evidence, not a frame-rate or Twitch performance claim.
- The real main Codex CLI was resumed with its original session ID.
  `/status` displayed `01a16f7e-4c97-70f1-81b9-46b2c4e2e308`. The actual screen
  supplies the review's still frame. Only cropping, scaling and an opaque email
  privacy mask were applied. Provider interface text is retained.
- A real terminal rerun passed all 76 tests and displayed actual Git commits.
  The local workspace path is masked in the review. The earlier three browser
  scenarios passed; this media-only change does not alter the application.

The first OBS take contained a browser password-save popup and was discarded
from the edit. The capture profile's password manager was disabled and the round
recorded again. A premature copy made before OBS finalized its first file was
also replaced with finalized source. Neither issue changes the application.
Source audio is discarded so background desktop audio cannot enter the review.

## Voice and captions

The user requested a young British female voice. The selected local preset is
**Kokoro bf_emma**, `en-gb`, speed 1.03, directed as a youthful adult. The preset
does not verify the speaker's age. It is synthetic stock narration, not a clone
of a requested person. Audition: 10.142 seconds; complete narration: 117.437
seconds with 500 ms paragraph gaps. No music or sound effects.

An authorized short ElevenLabs Beth / eleven_v3 audition request returned HTTP
402 `payment_required`; no audio was generated and no paid plan was created.
The review uses only locally generated Kokoro audio.

Tool/model provenance:

| Component | Actual version/source |
| --- | --- |
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | v1.0, Apache-2.0 |
| [Voice catalog](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) | bf_emma, British female preset |
| [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) | 0.6.1, MIT |
| ONNX Runtime / SoundFile | 1.31.0 / 0.14.0, isolated local Python environment |
| faster-whisper / model | 1.2.1 / tiny.en CPU int8; FFmpeg decoded PCM |
| Videowright / FFmpeg | 0.3.0 / 6.1.1 |

Local model artifact SHA-256:

- `kokoro-v1.0.onnx`: `beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a`
- `voices-v1.0.bin`: `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d`

The script is `videos/videos/demo/voiceover_script/script.md`. Audio, paragraph
windows, actual ASR word timestamps and voice metadata stay in ignored
`videos/media/voice/`. `scripts/captions.py` groups the measured ASR timings and
corrects recognized project/tool names against the script. Narration describes
disconnect recovery as implemented/tested behavior; the visible capture shows
controller pause/resume, with mocked provider coverage clearly labeled.

## Reproduce the edit

Install the isolated `videos/` dependencies. Keep the actual reviewed source
files in `videos/media/`; never substitute generated UI for genuine captures.
The public edit manifest is `videos/videos/demo/local-review-edit.json`.
`codex-status-redacted.png` and the architecture PNG are public still inputs.
The private OBS and terminal sources and narration cannot be reconstructed just
by cloning the repository; record new local sources if they are unavailable.

```sh
cd videos
npm ci
npm run typecheck
npm run render:review-graphics
npm run render:local-review
ffprobe -v error -show_entries format=duration,size -of json out/rallyroom-local-review.mp4
```

Videowright authors/renders the opening with the supplied full RallyRoom logo and the evidence disclosure. FFmpeg trims,
changes speed, assembles the real capture clips, adds measured captions and
normalizes the local narration. Gameplay cuts and speed changes are labeled.
The review renderer asserts duration, dimensions and audio presence, and never
uploads. The genuine Twitch manifest/assembly gate is unchanged and still
requires reviewed consenting-channel footage. Private sources and build exports are ignored. Only the reviewed MP4/captions are copied into `docs/media/` for the user-authorized public push. The SHA-256 and exact technical checks are in `docs/evidence/local-review.json`.
