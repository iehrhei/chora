/* The O of CHORA, as a printed cameo: the letter's own heavy ink ring, a flat spot tint,
   and a one-colour line drawing redrawn from an Attic red-figure cup of the 4th century BC —
   a Nereid riding a dolphin, an octopus overhead, an egg-and-dart band below. */
(function(){
const NS = 'http://www.w3.org/2000/svg';
let W = 200, H = 245, CX = 100, CY = 122.5, IRX = 81, IRY = 108, ORX = 99, ORY = 121, ROT = -6;
const INK = '#2a221b', LINE = '#24202c', TINT = '#a9cfcb';

function el(tag, attrs, parent){ const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; }
function ellipsePath(rx, ry, rot){
  const a = rot * Math.PI / 180, pts = [];
  for (let i = 0; i <= 120; i++){ const t = i / 120 * Math.PI * 2, x = rx * Math.cos(t), y = ry * Math.sin(t);
    pts.push((CX + x * Math.cos(a) - y * Math.sin(a)).toFixed(2) + ',' + (CY + x * Math.sin(a) + y * Math.cos(a)).toFixed(2)); }
  return 'M' + pts.join(' L') + ' Z';
}

function build(svg, src){
  const sh = window.CHORA_SHAPE || {}; W = sh.W || 240; H = sh.H || 245; CX = W / 2; CY = H / 2;
  IRX = sh.irx || 99; IRY = sh.iry || 105; ORX = sh.orx || 119; ORY = sh.ory || 121; ROT = sh.rot !== undefined ? sh.rot : -4;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const uid = 'c' + Math.random().toString(36).slice(2, 7);
  const defs = el('defs', {}, svg);
  // an unevenly inked spot colour
  const mott = el('filter', { id: uid + 'm', x: '0', y: '0', width: '100%', height: '100%' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: '.03', numOctaves: '3', seed: '11', result: 'n' }, mott);
  el('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .34 -.12', result: 'w' }, mott);
  el('feComposite', { in: 'w', in2: 'SourceGraphic', operator: 'atop', result: 'a' }, mott);
  el('feMerge', {}, mott).append(el('feMergeNode', { in: 'SourceGraphic' }), el('feMergeNode', { in: 'a' }));
  // a little speckle where the ink of the ring did not take
  const spk = el('filter', { id: uid + 's', x: '0', y: '0', width: '100%', height: '100%' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: '1.2', numOctaves: '1', seed: '8', result: 'g' }, spk);
  el('feColorMatrix', { in: 'g', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -11 8.6', result: 'm' }, spk);
  el('feComposite', { in: 'SourceGraphic', in2: 'm', operator: 'in' }, spk);
  const clip = el('clipPath', { id: uid + 'c' }, defs); el('path', { d: ellipsePath(IRX, IRY, ROT) }, clip);
  const mask = el('mask', { id: uid + 'k', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);

  // the drawing, as an ink mask: 690 × 640 source units → about 180 wide, nudged up a touch
  // crop: a window onto the source drawing (source units: the image spans x 40–730, y 80–720)
  const c = Object.assign({ x: 40, y: 80, w: 690, cx: CX, cy: CY - 1.5, width: 172 }, window.CHORA_CROP || {});
  const k = c.width / c.w, iw = 690 * k, ih = 640 * k;
  const ix = c.cx - (c.x + c.w / 2 - 40) * k, iy = c.cy - ((c.y !== undefined ? c.y : 80) - 80) * k - (c.h ? c.h * k / 2 : ih / 2);
  el('image', { href: src || 'assets/chora-ink.png', x: ix, y: iy, width: iw, height: ih, preserveAspectRatio: 'none' }, mask);

  el('path', { d: ellipsePath(IRX + 2, IRY + 2, ROT), fill: TINT, filter: `url(#${uid}m)`, transform: 'translate(1.1,.8)' }, svg);   // tint, a hair off register
  const art = el('g', { 'clip-path': `url(#${uid}c)` }, svg);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: LINE, mask: `url(#${uid}k)` }, art);
  el('path', { d: ellipsePath(ORX, ORY, 0) + ' ' + ellipsePath(IRX, IRY, ROT), fill: INK, 'fill-rule': 'evenodd', filter: `url(#${uid}s)` }, svg);  // the letter
  return {};
}
window.KhoraTondo = { build };
})();
