import { defineSegment } from 'videowright';
export default defineSegment({
  id:'capture-gate',advances:[6],
  notes:'Development-only missing-footage card. Never substitute for live footage in a submission.',
  mount(el){el.style.cssText='width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;padding:120px;background:var(--color-bg);color:var(--color-fg);font-family:var(--font-body)';const title=document.createElement('h1');title.textContent='Genuine capture pending';title.style.cssText='font-size:84px;margin:0 0 40px';const p=document.createElement('p');p.textContent='Add consenting Twitch / OBS footage and the actual Codex build recording before assembling the final demo.';p.style.cssText='font-size:46px;line-height:1.5;max-width:1650px';el.append(title,p);},
  async play(ctx){await ctx.waitForNext();},
});
