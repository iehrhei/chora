/* CHORA — sound.
   Behind the wall: the stillness of the room, and one other room, chosen at random each visit.
   Looking into the mirror muffles them, as if under water; when the sea comes, they fall away
   and a low, slow deep takes their place. The small sounds of the hand — pencil, paper, glass,
   wood, the mirror's strap — are made here, not recorded. Nothing plays until the visitor asks. */
(function(){
const ROOMS = ['room-a', 'room-b', 'room-c', 'room-d', 'room-e'];
let ctx = null, master, roomBus, roomLP, deepBus, fxBus, noiseBuf, on = false, state = 'day', loading = null;

function noise(sec, kind){
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++){ const w = Math.random() * 2 - 1; if (kind === 'brown'){ last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  return b;
}
async function loadLoop(name, gain){
  const r = await fetch(`sound/${name}.m4a`); const buf = await ctx.decodeAudioData(await r.arrayBuffer());
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
  const g = ctx.createGain(); g.gain.value = 0; s.connect(g).connect(roomBus);
  s.start(0, Math.random() * buf.duration);                       // never quite the same moment twice
  g.gain.setTargetAtTime(gain, ctx.currentTime + .1, 2.5);
  return s;
}
function buildDeep(){
  // a slow, low body of water: brown noise, filtered, breathing
  const src = ctx.createBufferSource(); src.buffer = noise(8, 'brown'); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = .3;
  const g = ctx.createGain(); g.gain.value = .55;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .06; lg.gain.value = .25; lfo.connect(lg).connect(g.gain); lfo.start();
  src.connect(lp).connect(g).connect(deepBus); src.start();
  // now and then, something far away
  const ping = () => {
    if (state === 'deep' && on){
      const t = ctx.currentTime, f = [196, 233, 262, 311, 349][Math.floor(Math.random() * 5)] * (Math.random() < .5 ? 1 : 2);
      const o = ctx.createOscillator(), og = ctx.createGain(), d = ctx.createDelay(2), fb = ctx.createGain(), dl = ctx.createBiquadFilter();
      o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .985, t + 6);
      og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(.035, t + 1.2); og.gain.exponentialRampToValueAtTime(.0001, t + 7);
      d.delayTime.value = .9 + Math.random() * .6; fb.gain.value = .42; dl.type = 'lowpass'; dl.frequency.value = 900;
      o.connect(og); og.connect(deepBus); og.connect(d); d.connect(dl).connect(fb).connect(d); dl.connect(deepBus);
      o.start(t); o.stop(t + 7.5);
    }
    setTimeout(ping, 9000 + Math.random() * 14000);
  };
  setTimeout(ping, 5000);
}
async function start(){
  if (ctx){ await ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  roomLP = ctx.createBiquadFilter(); roomLP.type = 'lowpass'; roomLP.frequency.value = 18000; roomLP.Q.value = .5;
  roomBus = ctx.createGain(); roomBus.connect(roomLP).connect(master);
  deepBus = ctx.createGain(); deepBus.gain.value = 0; deepBus.connect(master);
  fxBus = ctx.createGain(); fxBus.gain.value = .9; fxBus.connect(master);
  noiseBuf = noise(2, 'white');
  buildDeep();
  loading = Promise.all([loadLoop('room-tone', .9), loadLoop(ROOMS[Math.floor(Math.random() * ROOMS.length)], .75)]).catch(() => {});
  apply(true);
}
function apply(now){
  if (!ctx) return;
  const t = ctx.currentTime, k = now ? .01 : 1;
  const P = { day: [18000, 1, 0], peek: [1100, .8, .15], deep: [380, .12, 1] }[state];
  roomLP.frequency.setTargetAtTime(P[0], t, (state === 'peek' ? .8 : 1.6) * k);
  roomBus.gain.setTargetAtTime(P[1], t, 1.8 * k);
  deepBus.gain.setTargetAtTime(P[2] * .9, t + (state === 'deep' ? 1.5 : 0), 2.5 * k);
}

/* ———— the small sounds of the hand ———— */
const MAT = { bottle: 'glass', vase: 'glass', cup: 'ceramic', mushroom: 'ceramic', plant: 'ceramic', pebble: 'stone',
              book: 'paper', postcards: 'paper', card: 'paper', frame: 'wood', smallframe: 'wood', diatom: 'paper', haeckel: 'paper' };
function burst({ dur = .08, f = 2000, q = 1, gain = .2, type = 'bandpass', at = 0 }){
  const t = ctx.currentTime + at, s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = .8 + Math.random() * .4;
  const bp = ctx.createBiquadFilter(); bp.type = type; bp.frequency.value = f; bp.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(bp).connect(g).connect(fxBus); s.start(t, Math.random()); s.stop(t + dur + .05);
}
function tone(freqs, { dur = .5, gain = .05, at = 0 } = {}){
  const t = ctx.currentTime + at;
  freqs.forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * (1 + (Math.random() - .5) * .01);
    const a = gain / (i + 1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .003); g.gain.exponentialRampToValueAtTime(.0001, t + dur / (1 + i * .5));
    o.connect(g).connect(fxBus); o.start(t); o.stop(t + dur + .05);
  });
}
const S = {
  enabled: () => on,
  async set(v){ on = v; if (v){ await start(); } if (ctx){ master.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, v ? 1.2 : .3); } return on; },
  state(s){ if (s === state) return; state = s; apply(false); },
  pick(o){ if (!on || !ctx) return; const m = MAT[o.id] || 'wood';
    if (m === 'paper') burst({ dur: .14, f: 3800, q: .7, gain: .07 });
    else burst({ dur: .05, f: 1400, q: 1.2, gain: .06 }); },
  land(o, v){ if (!on || !ctx) return; const m = MAT[o.id] || 'wood', k = Math.min(1, v / 30);
    if (m === 'glass'){ burst({ dur: .05, f: 900, q: 1, gain: .12 * k }); const b = 1700 + Math.random() * 600; tone([b, b * 2.76, b * 5.4], { dur: .55, gain: .05 * k }); }
    else if (m === 'ceramic'){ burst({ dur: .06, f: 700, q: 1, gain: .16 * k }); const b = 900 + Math.random() * 300; tone([b, b * 2.3], { dur: .22, gain: .035 * k }); }
    else if (m === 'stone'){ burst({ dur: .03, f: 2600, q: 2, gain: .16 * k }); burst({ dur: .03, f: 2400, q: 2, gain: .07 * k, at: .07 }); }
    else if (m === 'paper'){ burst({ dur: .1, f: 500, q: .7, gain: .14 * k, type: 'lowpass' }); burst({ dur: .12, f: 3000, q: .6, gain: .05 * k }); }
    else { burst({ dur: .09, f: 260, q: .8, gain: .3 * k, type: 'lowpass' }); burst({ dur: .03, f: 1800, q: 1.5, gain: .05 * k }); } },
  stick(){ if (!on || !ctx) return; burst({ dur: .2, f: 2400, q: .5, gain: .06 }); burst({ dur: .04, f: 300, q: .8, gain: .1, type: 'lowpass', at: .18 }); },
  creak(strength){ if (!on || !ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(95 + Math.random() * 30, t); o.frequency.linearRampToValueAtTime(70 + Math.random() * 20, t + .35);
    bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.025 * Math.min(1, strength), t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + .4);
    o.connect(bp).connect(g).connect(fxBus); o.start(t); o.stop(t + .45); },
  /* pencil on plaster: grain that follows the speed of the hand */
  scratch(speed){ if (!on || !ctx) return;
    if (!S._pen){ const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 4200; hp.Q.value = .6;
      const g = ctx.createGain(); g.gain.value = 0; s.connect(hp).connect(g).connect(fxBus); s.start(); S._pen = { g, hp }; }
    const t = ctx.currentTime, k = Math.min(1, speed / 1.2);
    S._pen.g.gain.setTargetAtTime(.05 * k, t, .015); S._pen.hp.frequency.setTargetAtTime(3200 + k * 2600, t, .03);
    clearTimeout(S._penT); S._penT = setTimeout(() => S._pen && S._pen.g.gain.setTargetAtTime(0, ctx.currentTime, .03), 70); },
  /* the ink waking in the dark */
  shimmer(){ if (!on || !ctx) return; const t = ctx.currentTime;
    [1568, 2093, 2637, 3136].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * .6); g.gain.linearRampToValueAtTime(.008, t + i * .6 + 2.2); g.gain.exponentialRampToValueAtTime(.0001, t + i * .6 + 8);
      o.connect(g).connect(fxBus); o.start(t + i * .6); o.stop(t + i * .6 + 8.2); }); },
};
document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : (on && ctx.resume()); });
window.ChoraSound = S;
})();
