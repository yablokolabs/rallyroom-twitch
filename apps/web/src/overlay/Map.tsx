import type { PublicState } from '../../../../packages/game/src/schema.js';
export function RescueMap({ state }: { state: PublicState }) {
  const scout = state.progress.scout, bridge = state.progress.build / state.targets.build, beacon = state.progress.charge / state.targets.charge;
  const won = state.outcome === 'success';
  return <svg className="rescue-map" viewBox="0 0 1000 600" role="img" aria-label={`Rescue map. ${scout} of 3 route markers revealed, bridge ${Math.round(bridge * 100)} percent built, beacon ${Math.round(beacon * 100)} percent charged.`}>
    <defs>
      <pattern id="water" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M5 30q8-5 16 0t16 0" fill="none" stroke="#447b8c" strokeWidth="1" opacity=".3" /></pattern>
      <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#7eb1b2" opacity=".07" /></pattern>
      <linearGradient id="sea" x2="1" y2="1"><stop stopColor="#183b4c"/><stop offset="1" stopColor="#102d40"/></linearGradient>
      <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#ffd26a" stopOpacity=".5"/><stop offset="1" stopColor="#ffd26a" stopOpacity="0"/></linearGradient>
    </defs>
    <rect width="1000" height="600" fill="url(#sea)"/><rect width="1000" height="600" fill="url(#water)"/><rect width="1000" height="600" fill="url(#grid)"/>
    <g fill="none" stroke="#426775" strokeWidth="1.5" opacity=".5"><path d="M-30 500C50 410 10 240 120 130S380 60 442 160 350 390 450 500 570 560 610 620"/><path d="M-20 535C90 440 40 255 150 150S355 100 412 175 322 390 423 520 550 580 570 630"/><path d="M580-10C530 80 630 98 655 135S600 300 695 380 930 390 1040 300"/><path d="M610-10C570 65 650 65 685 125S640 290 715 350 920 365 1040 270"/></g>
    <g transform="translate(0 16)" fill="#0c2631"><path d="M62 368 94 294 160 271 185 209 242 175 318 190 371 245 345 312 392 380 345 444 246 478 155 443 90 450Z"/><path d="M610 262 657 198 736 187 775 150 859 178 912 235 924 309 874 373 798 396 708 363 638 377 594 327Z"/></g>
    <path d="M62 368 94 294 160 271 185 209 242 175 318 190 371 245 345 312 392 380 345 444 246 478 155 443 90 450Z" fill="#648977" stroke="#87aa8a" strokeWidth="3"/>
    <path d="M88 365 116 310 180 293 209 225 247 202 301 215 341 254 319 316 365 379 324 423 245 451 161 415 111 425Z" fill="#74977b"/>
    <path d="M610 262 657 198 736 187 775 150 859 178 912 235 924 309 874 373 798 396 708 363 638 377 594 327Z" fill="#668e77" stroke="#9ab595" strokeWidth="3"/>
    <path d="M636 264 675 223 745 213 783 179 842 201 884 249 896 302 856 349 797 368 708 336 653 350 621 321Z" fill="#7b9c7b"/>
    <g fill="#416c60" stroke="#96b79a" strokeWidth="2">{[[112,335],[205,235],[329,352],[285,420],[675,260],[858,280],[827,340],[739,228]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><path d="M-14 4 0-26 14 4Z"/><path d="M-19 16 0-16 19 16Z"/><path d="M0 15v10" stroke="#345747" strokeWidth="5"/></g>)}</g>
    <g stroke="#1d4a45" strokeWidth="3" fill="#b6bd9a"><path d="m275 239 20-28 21 28Z"/><path d="m749 310 20-28 21 28Z"/><path d="m294 249 15-20 15 20Z"/></g>
    <path d="M160 375Q188 380 223 342T282 300Q320 272 360 297L650 301Q718 295 786 252" stroke="#183f3e" strokeWidth="18" fill="none" strokeLinecap="round"/>
    <path d="M160 375Q188 380 223 342T282 300Q320 272 360 297" stroke={scout ? '#ffd075' : '#b4c6a9'} strokeWidth="8" strokeDasharray={scout===3?'none':'2 15'} fill="none" strokeLinecap="round"/>
    <g transform="translate(370 277)"><path d="M0 0 270 0M0 50 270 50" stroke="#79958f" strokeWidth="4" strokeDasharray={bridge===1?'none':'9 9'}/>{Array.from({length:12},(_,i)=><rect key={i} x={i*23} y="5" width="18" height="40" rx="3" fill={i/12 < bridge?'#dfae75':'#2c535d'} stroke={i/12<bridge?'#f4cf9a':'#517079'}/>)}</g>
    <path d="M650 301Q718 295 786 252" stroke={beacon>0?'#ffd075':'#a6b698'} strokeWidth="8" fill="none" strokeDasharray={won?'none':'2 15'} strokeLinecap="round"/>
    {[[223,342],[282,300],[350,294]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><circle r="16" fill={scout>i?'#ffb779':'#31574f'} stroke="#f8e8c8" strokeWidth="2"/><text y="5" textAnchor="middle" fill={scout>i?'#263b3c':'#f3edda'} fontSize="14" fontWeight="800">{scout>i?'✓':i+1}</text></g>)}
    <g transform="translate(145 367)"><path d="M-30 12 0-34 30 12Z" fill="#f4a66d" stroke="#392f36" strokeWidth="3"/><path d="M-10 12 0-10 10 12Z" fill="#263d3c"/><path d="M-40 16H40" stroke="#c7cb9a" strokeWidth="4"/></g>
    <g transform="translate(790 242)">{beacon>0&&<path d="M-18-40-65-165H65L18-40Z" fill="url(#beam)"/>}<ellipse cy="27" rx="44" ry="16" fill="#4f7968"/><path d="M-25 22-15-45H15L25 22Z" fill="#eae4c8" stroke="#213f43" strokeWidth="3"/><path d="M-22 5H22L19-9H-19Z" fill="#ff9b69"/><rect x="-20" y="-59" width="40" height="24" rx="5" fill={beacon>0?'#ffd479':'#446963'} stroke="#213f43" strokeWidth="3"/><path d="M-27-61 0-80 27-61Z" fill="#ffab75" stroke="#213f43" strokeWidth="3"/><circle cy="-47" r="6" fill={won?'#fff7cf':'#b7bfa1'}/></g>
    <g transform="translate(882 398)"><path d="m-24-8 12 26H23L38-8Z" fill="#ffc173"/><path d="M-33-11H45" stroke="#f1e6c8" strokeWidth="5"/><rect x="-3" y="-29" width="20" height="17" rx="3" fill="#e2e4cc"/></g>
    <g fontFamily="system-ui,sans-serif" fontSize="12" fontWeight="700" letterSpacing="2" fill="#d2e5df"><text x="130" y="475">BASE CAMP</text><text x="275" y="170">LOOKOUT RIDGE</text><text x="443" y="363">THE CROSSING</text><text x="741" y="434">RESCUE POINT</text></g>
    <g transform="translate(911 77)" fill="none" stroke="#a2c4c1"><circle r="25" opacity=".5"/><path d="M0-20V20M-20 0H20" opacity=".4"/><path d="m0-17 6 17-6-4-6 4Z" fill="#b3d1c8"/><text x="0" y="-33" fill="#b3d1c8" stroke="none" textAnchor="middle" fontSize="12" fontFamily="system-ui">N</text></g>
    <g transform="translate(42 42)" fill="#aecbc8" fontFamily="monospace" fontSize="11"><text>SECTOR 04 / NORTHSTAR</text><text y="19" opacity=".6">CHART A · COOPERATIVE RESCUE</text></g>
    {won&&<g transform="translate(500 500)"><rect x="-140" y="-30" width="280" height="55" rx="12" fill="#ffe19a"/><text textAnchor="middle" y="5" fontSize="22" fontWeight="800" fill="#163c40" fontFamily="system-ui">ALL CREW HOME ✓</text></g>}
  </svg>;
}
