/* ==========================================================
   Kitchen Warzone – shared data, drawing helpers & sound
   ========================================================== */
const KW = window.KW || (window.KW = {});

/* ---------- Ingredients ---------- */
KW.INGR = {
  bread:   { name: 'Bread',   emoji: '🍞', process: null,   source: 'counter' },
  tomato:  { name: 'Tomato',  emoji: '🍅', process: 'chop', source: 'counter' },
  lettuce: { name: 'Lettuce', emoji: '🥬', process: 'chop', source: 'counter' },
  potato:  { name: 'Potato',  emoji: '🥔', process: 'boil', source: 'counter' },
  rice:    { name: 'Rice',    emoji: '🌾', process: 'boil', source: 'counter' },
  cheese:  { name: 'Cheese',  emoji: '🧀', process: 'chop', source: 'fridge' },
  egg:     { name: 'Egg',     emoji: '🥚', process: 'fry',  source: 'fridge' },
  meat:    { name: 'Meat',    emoji: '🥩', process: 'fry',  source: 'fridge' },
};
KW.PANTRY_IDS = ['bread', 'tomato', 'lettuce', 'potato', 'rice'];
KW.FRIDGE_IDS = ['cheese', 'egg', 'meat', 'tomato', 'lettuce'];

KW.PROCESS = {
  chop: { verb: 'Chop', done: 'chopped', station: 'cutting board', utensil: 'knife', badge: '🔪' },
  fry:  { verb: 'Fry',  done: 'fried',   station: 'stove',         utensil: 'pan',   badge: '🔥' },
  boil: { verb: 'Boil', done: 'boiled',  station: 'stove',         utensil: 'pot',   badge: '💧' },
};
KW.STATE_BADGE = { chopped: '🔪', fried: '🔥', boiled: '💧', burnt: '💨' };
KW.STATE_LABEL = { raw: 'Raw', chopped: 'Chopped', fried: 'Fried', boiled: 'Boiled', burnt: 'Burnt' };

/* ---------- Recipes ---------- */
KW.RECIPES = [
  { id: 'sandwich', name: 'Sandwich',   emoji: '🥪', needs: ['bread', 'tomato:chopped', 'cheese:chopped'] },
  { id: 'salad',    name: 'Salad',      emoji: '🥗', needs: ['lettuce:chopped', 'tomato:chopped'] },
  { id: 'eggtoast', name: 'Egg Toast',  emoji: '🍳', needs: ['bread', 'egg:fried'] },
  { id: 'burger',   name: 'Burger',     emoji: '🍔', needs: ['bread', 'meat:fried', 'lettuce:chopped'] },
  { id: 'stew',     name: 'Stew',       emoji: '🍲', needs: ['potato:boiled', 'meat:fried'] },
  { id: 'ricebowl', name: 'Rice Bowl',  emoji: '🍛', needs: ['rice:boiled', 'egg:fried'] },
];

/* ---------- Utensils ---------- */
KW.UTENSILS = {
  knife: { name: 'Knife', for: 'Cutting board', svg: '<span class="emo">🔪</span>' },
  pan: {
    name: 'Frying pan', for: 'Stove (fry)',
    svg: `<svg viewBox="0 0 100 60" class="ut-svg"><ellipse cx="40" cy="32" rx="34" ry="22" fill="#3b3f4a" stroke="#2b1d14" stroke-width="4"/><ellipse cx="40" cy="30" rx="25" ry="14" fill="#5b6273"/><rect x="70" y="26" width="28" height="10" rx="4" fill="#8a5428" stroke="#2b1d14" stroke-width="3"/></svg>`,
  },
  pot: {
    name: 'Cooking pot', for: 'Stove (boil)',
    svg: `<svg viewBox="0 0 100 80" class="ut-svg"><rect x="4" y="30" width="18" height="9" rx="4" fill="#2b1d14"/><rect x="78" y="30" width="18" height="9" rx="4" fill="#2b1d14"/><rect x="16" y="22" width="68" height="52" rx="10" fill="#c3cad4" stroke="#2b1d14" stroke-width="4"/><ellipse cx="50" cy="22" rx="35" ry="8" fill="#7f8896" stroke="#2b1d14" stroke-width="4"/></svg>`,
  },
};

/* ---------- Family members ---------- */
KW.FAMILY = [
  { id: 'dad',     name: 'Dad',     skin: '#f2c49b', hair: '#4a2d1a', shirt: '#2e86de', style: 'short', beard: true,  patience: 60, trait: 'Patient… until he isn\'t.' },
  { id: 'mom',     name: 'Mom',     skin: '#e8b48a', hair: '#8b3a1e', shirt: '#e84393', style: 'bun',   patience: 58, trait: 'Keeps an eye on everything you do.' },
  { id: 'kid',     name: 'Timmy',   skin: '#f6d0ae', hair: '#f0b429', shirt: '#20bf6b', style: 'spiky', patience: 42, trait: 'Tiny stomach, tiny patience.' },
  { id: 'grandma', name: 'Grandma', skin: '#f1c8a6', hair: '#d7d7e0', shirt: '#8e44ad', style: 'bun',   glasses: true, patience: 75, trait: 'Most patient – but she remembers.' },
  { id: 'teen',    name: 'Lucy',    skin: '#c98b62', hair: '#1e1b2e', shirt: '#fd9644', style: 'long',  patience: 50, trait: 'Sighs loudly. Very loudly.' },
  { id: 'grandpa', name: 'Grandpa', skin: '#eab995', hair: '#ececec', shirt: '#596275', style: 'bald',  glasses: true, beard: true, patience: 70, trait: 'Bangs the table with his spoon.' },
];

/* ---------- Mood model ---------- */
KW.MOODS = {
  happy:     { label: 'Happy',      icon: '😊', color: '#20bf6b', desc: 'Just sat down. Smiling, swinging legs, chatting with the family.', tip: '+10 🪙 tip' },
  peckish:   { label: 'Peckish',    icon: '😐', color: '#a3cb38', desc: 'Starting to look at the kitchen. Taps fingers on the table.', tip: '+6 🪙 tip' },
  hungry:    { label: 'Hungry',     icon: '😟', color: '#f7b731', desc: 'Stomach growls "GRRR", sweat drops, eyes glued to the chef.', tip: '+3 🪙 tip' },
  hangry:    { label: 'HANGRY',     icon: '😡', color: '#eb3b5a', desc: 'Red face, steam out of the ears, bangs the cutlery. About to leave!', tip: 'no tip' },
  left:      { label: 'Stormed off',icon: '💢', color: '#5f2a2a', desc: 'Patience hit zero – they leave the table and you lose a ❤️.', tip: '−1 ❤️' },
  delighted: { label: 'Delighted',  icon: '😍', color: '#ff6fb5', desc: 'Correct dish delivered! Hearts and happy munching.', tip: 'coins!' },
  disgusted: { label: 'Disgusted',  icon: '🤢', color: '#7bed9f', desc: 'Wrong dish! They push it back and lose 15% patience.', tip: '−15% patience' },
};
KW.MOOD_ORDER = ['happy', 'peckish', 'hungry', 'hangry', 'left'];
/** frac = remaining patience 0..1 */
KW.moodFor = (frac) => frac > 0.66 ? 'happy' : frac > 0.4 ? 'peckish' : frac > 0.2 ? 'hungry' : frac > 0 ? 'hangry' : 'left';
KW.urgencyFor = (frac) => frac > 0.4 ? 'calm' : frac > 0.2 ? 'warn' : 'crit';

/* ---------- Helpers ---------- */
KW.itemKey = (it) => it.state === 'raw' ? it.id : `${it.id}:${it.state}`;
KW.parseKey = (k) => { const [id, state = 'raw'] = k.split(':'); return { id, state }; };
KW.matchRecipe = (items) => {
  const keys = items.map(KW.itemKey).sort().join('|');
  return KW.RECIPES.find(r => [...r.needs].sort().join('|') === keys) || null;
};
KW.ingIcon = (it, extra = '') => {
  const ing = KW.INGR[it.id];
  const badge = KW.STATE_BADGE[it.state];
  return `<span class="ing st-${it.state} ${extra}" title="${KW.STATE_LABEL[it.state]} ${ing.name}"><span class="e">${ing.emoji}</span>${badge ? `<span class="b">${badge}</span>` : ''}</span>`;
};
KW.fmt = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/* ---------- Order ticket (used by game + doc) ---------- */
KW.ticketHTML = (m, idx) => {
  const frac = Math.max(0, m.patience / m.max);
  const u = KW.urgencyFor(frac);
  const ings = m.recipe.needs.map(k => KW.ingIcon(KW.parseKey(k))).join('');
  return `<div class="ticket u-${u}" data-seat="${idx}">
    <div class="t-top">
      <span class="t-dish">${m.recipe.emoji}</span>
      <div class="t-info"><b>${m.recipe.name}</b><small>for ${m.name} · seat ${idx + 1}</small></div>
      <span class="t-time" id="ordT${idx}">(${Math.ceil(m.patience)})</span>
    </div>
    <div class="t-ings">${ings}</div>
    <div class="t-bar"><i id="ordBar${idx}" style="width:${frac * 100}%"></i></div>
  </div>`;
};

/* ---------- Character drawing ---------- */
KW.drawCharacter = (p, mood = 'happy', look = 0) => {
  const o = '#2b1d14', lx = look * 3.2;
  const hairBack = {
    long: `<path d="M19 48 Q16 98 30 98 L70 98 Q84 98 81 48Z" fill="${p.hair}" stroke="${o}" stroke-width="4"/>`,
    bun: `<circle cx="50" cy="15" r="11" fill="${p.hair}" stroke="${o}" stroke-width="4"/>`,
  }[p.style] || '';
  const hairFront = {
    short: `<path d="M21 46 Q20 17 50 17 Q80 17 79 46 Q70 31 50 32 Q32 31 21 46Z" fill="${p.hair}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>`,
    bun: `<path d="M21 47 Q20 19 50 19 Q80 19 79 47 Q66 29 50 31 Q34 29 21 47Z" fill="${p.hair}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>`,
    long: `<path d="M21 48 Q20 18 50 18 Q80 18 79 48 Q70 30 54 30 Q46 38 21 48Z" fill="${p.hair}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>`,
    spiky: `<path d="M21 44 L24 24 L32 30 L36 14 L44 26 L50 10 L56 26 L64 14 L68 30 L76 24 L79 44 Q66 32 50 33 Q34 32 21 44Z" fill="${p.hair}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>`,
    bald: `<path d="M22 54 Q18 38 28 32" stroke="${p.hair}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M78 54 Q82 38 72 32" stroke="${p.hair}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  }[p.style] || '';

  const eye = (cx, ry = 6) => `<ellipse cx="${cx}" cy="50" rx="5.2" ry="${ry}" fill="#fff" stroke="${o}" stroke-width="2.5"/><circle cx="${cx + lx}" cy="51" r="2.8" fill="${o}"/>`;
  let eyes = '', brows = '', mouth = '', extra = '';
  switch (mood) {
    case 'happy':
      eyes = eye(39) + eye(61);
      brows = `<path d="M33 40 Q39 35 45 40 M55 40 Q61 35 67 40" stroke="${o}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      mouth = `<path d="M40 63 Q50 73 60 63" stroke="${o}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      break;
    case 'peckish':
      eyes = eye(39, 4.2) + eye(61, 4.2);
      brows = `<path d="M33 42 L45 42 M55 42 L67 42" stroke="${o}" stroke-width="3" stroke-linecap="round"/>`;
      mouth = `<path d="M42 67 L58 67" stroke="${o}" stroke-width="3.5" stroke-linecap="round"/>`;
      break;
    case 'hungry':
      eyes = eye(39, 7) + eye(61, 7);
      brows = `<path d="M33 41 L45 36 M55 36 L67 41" stroke="${o}" stroke-width="3" stroke-linecap="round"/>`;
      mouth = `<path d="M40 69 Q45 63 50 68 Q55 73 60 67" stroke="${o}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M57 69 Q58 76 56 78" stroke="#6ec6ff" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      extra = `<path d="M80 30 Q84 38 80 42 Q76 38 80 30Z" fill="#6ec6ff" stroke="${o}" stroke-width="2"/>`;
      break;
    case 'hangry':
      eyes = eye(39, 4.5) + eye(61, 4.5);
      brows = `<path d="M31 37 L46 44 M54 44 L69 37" stroke="${o}" stroke-width="4.5" stroke-linecap="round"/>`;
      mouth = `<path d="M38 72 Q50 56 62 72Z" fill="#7a1f1f" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/><path d="M42 69 L58 69" stroke="#fff" stroke-width="3"/>`;
      break;
    case 'delighted':
      eyes = `<path d="M33 52 Q39 43 45 52 M55 52 Q61 43 67 52" stroke="${o}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      mouth = `<path d="M37 61 Q50 80 63 61Z" fill="#7a1f1f" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/><path d="M44 70 Q50 66 56 70 Q50 76 44 70Z" fill="#ff7a8a"/>`;
      extra = `<ellipse cx="30" cy="60" rx="6" ry="3.5" fill="#ff7a8a" opacity=".8"/><ellipse cx="70" cy="60" rx="6" ry="3.5" fill="#ff7a8a" opacity=".8"/>`;
      break;
    case 'disgusted':
      eyes = `<path d="M34 47 L44 53 M34 53 L44 47" stroke="${o}" stroke-width="3.5" stroke-linecap="round"/>` + eye(61, 6);
      brows = `<path d="M32 40 L46 43 M55 38 Q61 33 67 38" stroke="${o}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      mouth = `<path d="M39 67 Q44 62 50 67 Q56 72 61 66" stroke="${o}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M48 68 Q52 78 56 69Z" fill="#ff7a8a" stroke="${o}" stroke-width="2"/>`;
      extra = `<circle cx="50" cy="50" r="28" fill="#7bed9f" opacity=".35"/>`;
      break;
    case 'left':
      eyes = `<path d="M33 49 L45 52 M55 52 L67 49" stroke="${o}" stroke-width="4" stroke-linecap="round"/>`;
      brows = `<path d="M31 38 L46 44 M54 44 L69 38" stroke="${o}" stroke-width="4.5" stroke-linecap="round"/>`;
      mouth = `<path d="M40 71 Q50 61 60 71" stroke="${o}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      extra = `<circle cx="50" cy="50" r="28" fill="#ff2a2a" opacity=".3"/>`;
      break;
  }
  const tint = mood === 'hangry' ? `<circle cx="50" cy="50" r="28" fill="#ff2a2a" opacity=".38"/>` : '';
  const beard = p.beard ? `<path d="M25 57 Q28 84 50 84 Q72 84 75 57 Q64 70 50 70 Q36 70 25 57Z" fill="${p.hair}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>` : '';
  const glasses = p.glasses ? `<circle cx="39" cy="50" r="9" fill="none" stroke="${o}" stroke-width="2.5"/><circle cx="61" cy="50" r="9" fill="none" stroke="${o}" stroke-width="2.5"/><path d="M48 50 L52 50" stroke="${o}" stroke-width="2.5"/>` : '';
  // beard drawn before mouth so mouth stays visible
  return `<svg viewBox="0 0 100 112" class="char-svg" aria-label="${p.name} – ${mood}">
    <path d="M14 112 Q14 80 50 80 Q86 80 86 112Z" fill="${p.shirt}" stroke="${o}" stroke-width="4"/>
    ${hairBack}
    <circle cx="50" cy="50" r="30" fill="${p.skin}" stroke="${o}" stroke-width="4"/>
    ${tint}${extra}${beard}${hairFront}${brows}${eyes}${glasses}${mouth}
  </svg>`;
};

/* ---------- Chef drawing ---------- */
KW.CHEF_SVG = `<svg viewBox="0 0 100 120" class="chef-svg">
  <g class="chef-arm l"><circle cx="12" cy="98" r="9" fill="#f2c49b" stroke="#2b1d14" stroke-width="4"/></g>
  <g class="chef-arm r"><circle cx="88" cy="98" r="9" fill="#f2c49b" stroke="#2b1d14" stroke-width="4"/></g>
  <path d="M18 120 Q18 84 50 84 Q82 84 82 120Z" fill="#ffffff" stroke="#2b1d14" stroke-width="4"/>
  <path d="M40 86 L50 100 L60 86" fill="#ff5a3c" stroke="#2b1d14" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="50" cy="62" r="24" fill="#f2c49b" stroke="#2b1d14" stroke-width="4"/>
  <path d="M28 46 Q22 26 36 24 Q38 8 52 12 Q64 4 70 20 Q84 22 74 46Z" fill="#fff" stroke="#2b1d14" stroke-width="4" stroke-linejoin="round"/>
  <rect x="28" y="40" width="46" height="10" rx="3" fill="#fff" stroke="#2b1d14" stroke-width="4"/>
  <circle cx="42" cy="62" r="3.4" fill="#2b1d14"/><circle cx="58" cy="62" r="3.4" fill="#2b1d14"/>
  <path d="M38 72 Q44 69 50 72 Q56 69 62 72" stroke="#4a2d1a" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;

/* ---------- Tiny WebAudio sfx ---------- */
KW.sfx = (() => {
  let ctx = null, muted = false;
  const tone = (f, d = 0.08, type = 'square', v = 0.05, slide = 0) => {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f;
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), ctx.currentTime + d);
      g.gain.setValueAtTime(v, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + d);
    } catch (e) { /* audio unavailable */ }
  };
  return {
    get muted() { return muted; }, set muted(v) { muted = v; },
    pick: () => tone(660, 0.06, 'triangle', 0.06),
    drop: () => tone(440, 0.06, 'triangle', 0.06),
    chop: () => tone(1200, 0.03, 'square', 0.025),
    done: () => { tone(880, 0.08, 'triangle', 0.06); setTimeout(() => tone(1320, 0.1, 'triangle', 0.05), 70); },
    serve: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.06), i * 70)); },
    fail: () => tone(180, 0.25, 'sawtooth', 0.05, -80),
    tick: () => tone(1000, 0.04, 'square', 0.03),
    burn: () => tone(120, 0.4, 'sawtooth', 0.05, -40),
    err: () => tone(220, 0.08, 'square', 0.04),
  };
})();
