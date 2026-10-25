import { defineSegment } from 'videowright';

export default defineSegment({
  id: 'review-scope', advances: [8.566],
  notes: 'Evidence disclosure for the local review, not a claim of live Twitch use.',
  mount(el) {
    el.style.cssText = 'width:100%;height:100%;padding:100px 120px;background:var(--color-bg);color:var(--color-fg);font-family:var(--font-body);display:flex;flex-direction:column;justify-content:center;gap:35px';
    const label = document.createElement('p');
    label.textContent = 'LOCAL REVIEW · SIMULATED INPUTS';
    label.style.cssText = 'font-size:36px;letter-spacing:4px;color:var(--color-gold);margin:0';
    const title = document.createElement('h1');
    title.textContent = 'A working rescue. An honest record.';
    title.style.cssText = 'font-size:90px;line-height:1.15;margin:0;max-width:1600px';
    const text = document.createElement('p');
    text.textContent = 'Actual OBS output and Codex session. Twitch live-channel verification is still pending.';
    text.style.cssText = 'font-size:48px;line-height:1.45;color:#bfd3d9;max-width:1550px;margin:0';
    el.append(label, title, text);
    title.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'both' });
  },
  async play(ctx) { await ctx.waitForNext(); },
});
