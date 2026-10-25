import { defineSegment } from 'videowright';
import logoUrl from '../../../assets/rallyroom-logo.png';
let host: HTMLElement | null = null;
export default defineSegment({
  id: 'rescue-intro', advances: [8],
  notes: 'Eight-second opening graphic only. This is not footage or evidence of live Twitch play.',
  mount(el) {
    host = el;
    el.style.cssText = 'width:100%;height:100%;background:#fcfaf3;color:#0b2549;font-family:var(--font-display);padding:65px 120px;display:flex;flex-direction:column;align-items:center;justify-content:center';
    const logo = document.createElement('img');
    logo.src = logoUrl;logo.alt = 'RallyRoom — One chat. One mission.';
    logo.style.cssText = 'width:1680px;height:600px;object-fit:cover;flex-shrink:0';
    const lead = document.createElement('p');lead.textContent='Scout the route. Build the bridge. Power the rescue.';lead.style.cssText='font-size:46px;line-height:1.45;margin:26px 0 0';
    const chips = document.createElement('div');chips.style.cssText='display:flex;gap:32px;margin-top:32px';
    for(const [name,color] of [['SCOUT','#b94a1d'],['BUILDER','#087b83'],['ENGINEER','#916000']]){const p=document.createElement('div');p.textContent=name;p.style.cssText=`border:2px solid ${color};color:${color};padding:20px 44px;font-size:30px;letter-spacing:3px;border-radius:8px`;chips.append(p);}
    el.append(logo,lead,chips);
    logo.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,fill:'both'});
  },
  async play(ctx){await ctx.waitForNext();},
  unmount(){host?.replaceChildren();host=null;},
});
