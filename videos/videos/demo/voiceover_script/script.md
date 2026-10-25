# Local review narration

Status: generated-input review edit. This script explicitly discloses missing live Twitch verification. Requested voice direction: youthful adult British female. Local stock preset bf_emma; no paid service or cloned identity.

RallyRoom turns a Twitch chat room into a cooperative rescue crew. One chat. One mission. Three minutes to bring everyone home.

This recording uses local simulated inputs. The Twitch adapter is implemented, but a consenting live channel test is still pending.

Viewers join with a short command, then choose one of three roles. Scouts reveal the route. Builders complete the crossing. Engineers power the rescue beacon. Each stage unlocks the next, so the team has a shared reason to coordinate.

The controller starts the mission from a protected local dashboard. The overlay shows the objective, countdown, role totals and contributions. It keeps raw chat and individual names off screen.

Watch the route markers appear. Then the bridge fills in, and the beacon lights up. One accepted action per account every five seconds keeps repeated commands from counting twice. Role switching lets a small crew finish every stage.

A late arrival can join immediately. The catch-up card names the role that can help with the current objective. Targets stay fixed when somebody joins.

Pause freezes the timer and rejects gameplay actions. If chat disconnects, the mission pauses and shows the gap. The controller resumes after reconnection. RallyRoom cannot recover messages that Twitch never delivered.

The server checks exact command syntax, channel identity, participant roles, cooldowns and duplicate event IDs. The browser overlay only receives aggregate state. Twitch tokens stay on the server, and the app sends no bot replies.

OpenAI Codex built the reducer, transport, dashboard and tests in the recorded main build session. Seventy-six automated checks and three browser scenarios passed. The source, run instructions and architecture are now public on GitHub.

This local recording demonstrates the working mission and recovery behavior. Genuine Twitch gameplay and the final channel recording remain the next verification step.
