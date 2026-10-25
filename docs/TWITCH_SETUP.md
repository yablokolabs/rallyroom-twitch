# Twitch setup and authorization

Status on 2026-10-24: adapter implemented and tested with mocked HTTP/WebSocket responses. No app credentials, consenting channel, actual OAuth grant, live subscription or genuine Twitch gameplay verified in this workspace. Unconfigured live production startup was checked and remains offline. No bot messages are sent.

## Local prerequisites

Run the Node server and OBS on your graphical workstation. The application binds to `127.0.0.1` and accepts only its localhost host/origin. Do not expose it through a tunnel or public reverse proxy. Docker daemon access and OBS are unavailable on the build host; npm is the verified run path.

1. Register your own confidential application in the [Twitch developer console](https://dev.twitch.tv/console/apps). Set the OAuth redirect to `http://localhost:3000/auth/twitch/callback`. Change the port consistently if needed. Keep your client secret private.
2. Copy `.env.example` to `.env`, restrict its permissions (`chmod 600 .env` on Linux/macOS), and set `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, the consenting broadcaster's numeric `TWITCH_BROADCASTER_ID`, `TWITCH_CHANNEL_CONSENT=true`, and `RALLY_MODE=live`. No unrelated API keys are needed.
3. Restart with `npm run dev`, or `npm run build && npm start`. Open **http://localhost:3000**, matching the redirect hostname exactly. `localhost` and `127.0.0.1` have different cookie scopes; the application refuses an authorization start from the wrong one.
4. Read `.data/control-key` privately on your workstation and enter it in the dashboard. The key never appears in application logs or the overlay URL. Keep that terminal off the recording.
5. Choose **Authorize read-only chat**, sign in as the configured broadcaster and consent. Wait for **TWITCH · CONNECTED** before starting a round. Resolve the broadcaster’s numeric ID through the official Get Users endpoint before configuration; it accepts a login lookup with an app access token. Controller sign-in requires an already configured broadcaster or delegated ID. See https://dev.twitch.tv/docs/api/reference/#get-users and https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow. Keep that app token private; it does not replace the read-chat user grant.

The app uses the authorization-code grant with a server-held client secret, a random one-time state and a browser binding cookie. Twitch returns the authorization code to the local callback; the server exchanges it for tokens. See [Twitch authorization-code flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#authorization-code-grant-flow).

## Exact permissions and identities

| Item | RallyRoom choice |
| --- | --- |
| Chat token | User access token for the consenting broadcaster |
| Requested chat scope | `user:read:chat` only |
| Subscription | `channel.chat.message`, version `1` |
| Condition | `broadcaster_user_id` = configured broadcaster; `user_id` = the same validated broadcaster |
| Transport | WebSocket session ID from Twitch's welcome message |
| Bot sending / moderation APIs | None |
| Controller identity | Private local owner key, or Twitch `/validate` numeric user ID checked against broadcaster/explicit delegation list |

Twitch's chat subscription requires `user:read:chat`. App-token subscriptions have extra bot-scope/relationship requirements; this MVP deliberately uses the local user-token architecture. We do not copy the write-chat scope from send-enabled examples. [Subscription authorization](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage), [chat authentication architectures](https://dev.twitch.tv/docs/chat/authenticating/).

`TWITCH_CONTROL_USER_IDS` contains comma-separated numeric IDs the owner explicitly delegates pause/resume access to. **Twitch controller sign-in** requests no chat scope, validates client/user identity, and checks that allowlist. A delegated controller is labeled moderator in this app; RallyRoom does not infer or claim Twitch moderator status from a badge or display name. Moderators cannot start/reset, inject fixtures, clear history, or connect/disconnect chat. Revalidate their token on each control request. Controller tokens remain in process memory. Owner sessions expire after eight hours.

## Token lifecycle

RallyRoom validates the chat token at startup and hourly, checking client ID, broadcaster ID, expiry and scope. A 401 triggers a single in-flight refresh; the server stores rotated tokens atomically in `.data/twitch-tokens.json` with mode 0600. Refresh failure or provider revocation stops the subscription, forgets stored tokens, ends controller sessions and pauses gameplay. The UI requires reauthorization. Disconnect removes local tokens; use Twitch's account Connections page to revoke the provider grant. [Validation requirement](https://dev.twitch.tv/docs/authentication/validate-tokens/), [refresh behavior](https://dev.twitch.tv/docs/authentication/refresh-tokens/).

Disconnect also invalidates pending authorization work; delayed refresh/grant responses cannot restore locally forgotten credentials. No Twitch tokens enter React props, browser storage, overlay URLs, journal records or request logs. `.env`, `.data`, captured media and video exports are ignored by Git. Development static serving excludes server source and private data directories.

## EventSub connection and limits

The client subscribes after welcome, within Twitch's default ten-second window. It uses the server's keepalive timeout, handles ping/pong through `ws`, and never sends application messages to the socket. For a provider reconnect, it uses the issued URL unchanged after checking its secure Twitch origin, keeps the old connection until the replacement welcome, and does not resubscribe. A manual reconnect that replaces a socket, unexpected close or keepalive lapse pauses the mission, marks an unrecoverable gap and reconnects with a new subscription. The controller must resume after recovery; RallyRoom never invents missed commands. [WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/).

The documented user-token limits are three connections with enabled subscriptions, 300 enabled subscriptions per connection and total cost 10. RallyRoom uses one channel subscription and a temporary handoff socket. It applies bounded exponential reconnect delays and honors `Ratelimit-Reset` after a 429. Twitch's API uses token buckets; limit/remaining/reset headers describe the active allowance, so the client does not assume a fixed requests-per-minute number. [WebSocket limits](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/#subscription-limits), [API limits](https://dev.twitch.tv/docs/api/guide/#twitch-rate-limits).

## Consenting live verification

Use your own channel or one with explicit test consent. Start with 2–4 consenting people if available; one account can switch roles but does not establish multi-person usability. No automated chat sending is included.

- Join: each person types `!rally join`. Choose explicitly with `!rally role scout`, `!rally role builder` or `!rally role engineer`; public displays omit individual names.
- Start from the owner dashboard. Scouts use `!rally scout` three times, respecting the five-second per-account cooldown. Then builders use `!rally build` four times; engineers use `!rally charge` four times.
- Ask one person to join after the start. Confirm the overlay gives the current role/action and targets stay unchanged.
- A delegated controller pauses. A chat action during pause must not count. Resume and verify the countdown continues from the frozen value.
- Interrupt the local network briefly. Record the gap notice and pause. Restore connectivity, wait for connected, and resume manually. Messages during the gap are not replayed.
- Revoke the app grant in Twitch Connections. Verify the revoked state and stopped effects, then reauthorize. Capture actual observed timing; do not claim instant revocation solely from mocked tests.

Record date, participant count/consent, app commit, command sequence and observed effects in a private test note. Store only a sanitized summary in `docs/evidence/`. Preserve mode labels, remove credentials/private names and keep unedited recordings private until review. Genuine live verification is still pending.
