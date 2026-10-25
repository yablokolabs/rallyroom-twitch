# Public source publication

## Authorization

2026-10-25T10:50:14.703169+00:00: the user requested “push to github remote repo as public without footer attribution too”. This authorizes the public source repository. It does not establish completion of live verification, a final demo, application deployment or challenge submission.

Target: [https://github.com/yablokolabs/rallyroom-twitch](https://github.com/yablokolabs/rallyroom-twitch), under the authenticated GitHub account yablokolabs. No existing Git remote or repository at that name was found. Repository creation and source push are the next action at this checkpoint.

## Review performed

Scanned all four existing commits and 104 unique text blobs. No private runtime path is tracked; .env, .data, tokens, source captures, installed dependencies and video outputs stay excluded. The only long literal credential assignment found was the deliberately fake `rallyroom-e2e-only-control-key` in Playwright’s isolated .data/e2e setup. Project-secret comparisons found no matching values in history.

Checked authored UI, overlay, architecture and video-segment sources for footer/attribution blocks; none found. Existing dependency and asset disclosures remain in ASSETS_AND_NOTICES.md. No license was added to the user's code without a selection.

Latest application checks: 76 unit/adapter/API tests, 3 browser scenarios and production build passed in the recorded build checkpoint. This publication changes documentation only.

## Video status

The local Videowright opening exists at videos/out/intro.mp4: H.264, 1920×1080, 8.000 seconds. Its extracted frame is public source evidence in docs/evidence/videowright-intro.png. The reviewed media manifest and final review MP4 do not exist. Genuine consenting Twitch/OBS and main Codex interface recordings are still needed; no final demo or YouTube link is claimed.
