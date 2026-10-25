import { defineSegment } from 'videowright';
let host: HTMLElement | null = null;
export default defineSegment({
  id: 'rescue-intro', advances: [8],
  notes: 'Eight-second opening graphic only. This is not footage or evidence of live Twitch play.',
  mount(el) {
    host = el;
    el.style.cssText = 'width:100%;height:100%;background:var(--color-bg);color:var(--color-fg);font-family:var(--font-display);padding:110px 120px;display:flex;flex-direction:column;justify-content:center';
    const label = document.createElement('p');label.textContent='RALLYROOM';label.style.cssText='color:var(--color-accent);font-size:34px;letter-spacing:8px;font-weight:700;margin:0 0 40px';
    const title = document.createElement('h1');title.textContent='One chat. One mission.';title.style.cssText='font-size:112px;line-height:1.1;letter-spacing:-5px;margin:0 0 55px';
    const lead = document.createElement('p');lead.textContent='Scout the route. Build the bridge. Power the rescue.';lead.style.cssText='font-size:46px;line-height:1.45;max-width:1600px;margin:0;color:#bfd3d9';
    const chips = document.createElement('div');chips.style.cssText='display:flex;gap:32px;margin-top:65px';
    for(const [name,color] of [['SCOUT','var(--color-accent)'],['BUILDER','var(--color-aqua)'],['ENGINEER','var(--color-gold)']]){const p=document.createElement('div');p.textContent=name;p.style.cssText=`border:2px solid ${color};color:${color};padding:24px 44px;font-size:30px;letter-spacing:3px;border-radius:8px`;chips.append(p);}
    el.append(label,title,lead,chips);
    title.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,fill:'both'});
  },
  async play(ctx){await ctx.waitForNext();},
  unmount(){host?.replaceChildren();host=null;},
});
