/* ==========================================================
   Kitchen Warzone – interactive doc sections
   ========================================================== */
(() => {
  const $ = (s) => document.querySelector(s);
  const { INGR, RECIPES, FAMILY, MOODS, UTENSILS, PROCESS } = KW;

  /* ---------- 1. Sketch hotspots ---------- */
  const HOTSPOTS = [
    { x: 45, y: 25, area: 'player', title: 'Player (the chef)', text: 'The chef works from behind the counter. Clicking any station makes them run there – distance = time, so smart routing matters. Carries <b>one item at a time</b>.' },
    { x: 68, y: 22, area: 'fridge', title: 'Refrigerator', text: 'Top-right, the furthest point from the family. Opens a panel with fridge-only ingredients (🧀 🥚 🥩) and backup 🍅 🥬.' },
    { x: 33, y: 44, area: 'ingredients', title: 'Ingredients & tools', text: 'Quick-access counter: 🍞 🍅 🥬 🥔 🌾 with limited stock that slowly restocks, plus the utensil drawer, cutting board and bin.' },
    { x: 66, y: 43, area: 'cookzone', title: 'Stoves & plates', text: 'The inner box from the sketch: two stoves (top) that take a pan or a pot, and two plates (bottom) to assemble dishes.' },
    { x: 10, y: 60, area: 'orders', title: 'Food orders', text: 'Each ticket: dish + who ordered + ingredients + <b>(seconds left)</b>. Sorted by urgency, flashing red when nearly out of time.' },
    { x: 45, y: 71, area: 'members', title: 'Family members waiting', text: 'Seated across the counter. Their faces and body language show their mood as time passes – happy → peckish → hungry → HANGRY → gone.' },
  ];
  const wrap = $('#sketchWrap'), detail = $('#hotspotDetail');
  HOTSPOTS.forEach((h, i) => {
    const b = document.createElement('button');
    b.className = 'hotspot'; b.style.left = `${h.x}%`; b.style.top = `${h.y}%`; b.textContent = i + 1;
    b.onclick = () => {
      wrap.querySelectorAll('.hotspot').forEach(x => x.classList.toggle('on', x === b));
      detail.innerHTML = `<div class="hd-num">${i + 1}</div><h3>${h.title}</h3><p>${h.text}</p>
        <button class="btn" id="hdGo">Show me in the prototype ↓</button>
        <div class="hd-nav">${HOTSPOTS.map((_, j) => `<span class="${j === i ? 'on' : ''}" data-j="${j}"></span>`).join('')}</div>`;
      $('#hdGo').onclick = () => KW.highlight(h.area);
      detail.querySelectorAll('.hd-nav span').forEach(s => s.onclick = () => wrap.querySelectorAll('.hotspot')[+s.dataset.j].click());
    };
    wrap.appendChild(b);
  });
  wrap.querySelector('.hotspot').click();

  /* ---------- 3. Mood explorer ---------- */
  let who = FAMILY[0], pat = 100, override = null, overrideT = null, playing = false, playT = null, look = 0;
  const whoPick = $('#whoPick');
  whoPick.innerHTML = FAMILY.map((p, i) => `<button class="who-b ${i ? '' : 'on'}" data-i="${i}" title="${p.name}">${KW.drawCharacter(p, 'happy')}<span>${p.name}</span></button>`).join('');
  whoPick.querySelectorAll('.who-b').forEach(b => b.onclick = () => {
    who = FAMILY[+b.dataset.i]; whoPick.querySelectorAll('.who-b').forEach(x => x.classList.toggle('on', x === b));
    renderMood(); renderGallery();
  });
  $('#moodScale').innerHTML = KW.MOOD_ORDER.map(m => `<span style="--c:${MOODS[m].color}" data-m="${m}">${MOODS[m].icon}<small>${MOODS[m].label}</small></span>`).join('');
  $('#moodScale').querySelectorAll('span').forEach(s => s.onclick = () => {
    const v = { happy: 85, peckish: 55, hungry: 30, hangry: 10, left: 0 }[s.dataset.m];
    stopPlay(); override = null; setPat(v);
  });

  const slider = $('#patSlider');
  function setPat(v) { pat = v; slider.value = v; renderMood(); }
  slider.oninput = () => { stopPlay(); override = null; setPat(+slider.value); };

  function renderMood() {
    const mood = override || KW.moodFor(pat / 100);
    const M = MOODS[mood];
    $('#patVal').textContent = `${Math.round(pat)}%`;
    slider.style.setProperty('--fill', `${pat}%`);
    slider.style.setProperty('--c', MOODS[KW.moodFor(pat / 100)].color);
    $('#moodChar').innerHTML = KW.drawCharacter(who, mood, look);
    $('#moodStage').className = `mood-stage member mood-${mood}`;
    $('#moodTag').innerHTML = `<span style="background:${M.color}">${M.icon} ${M.label}</span>`;
    const secs = Math.round(who.patience * pat / 100);
    $('#moodDesc').innerHTML = `<b>${who.name}</b> – <i>${who.trait}</i><br>${M.desc}<div class="md-meta"><span>⏱ ~${secs}s of ${who.patience}s left</span><span>💰 ${M.tip}</span></div>`;
    $('#moodScale').querySelectorAll('span').forEach(s => s.classList.toggle('on', s.dataset.m === KW.moodFor(pat / 100) && !override));
  }
  function renderGallery() {
    $('#moodGallery').innerHTML = Object.keys(MOODS).map(m => `<div class="mg-item member mood-${m}">
      <div class="mg-face">${KW.drawCharacter(who, m)}<span class="mfx"></span></div>
      <b style="--c:${MOODS[m].color}">${MOODS[m].icon} ${MOODS[m].label}</b><small>${MOODS[m].desc}</small></div>`).join('');
  }
  function stopPlay() { playing = false; clearInterval(playT); $('#moodPlay').textContent = '▶ Simulate waiting'; }
  $('#moodPlay').onclick = () => {
    if (playing) return stopPlay();
    override = null; playing = true; $('#moodPlay').textContent = '⏸ Stop';
    if (pat <= 0) pat = 100;
    playT = setInterval(() => {
      pat = Math.max(0, pat - 0.8); look = Math.sin(Date.now() / 600);
      setPat(pat);
      if (pat <= 0) stopPlay();
    }, 60);
  };
  const flashMood = (m) => { stopPlay(); override = m; renderMood(); clearTimeout(overrideT); overrideT = setTimeout(() => { override = null; if (m === 'delighted') pat = 100; renderMood(); }, 2200); };
  $('#moodServe').onclick = () => { flashMood('delighted'); KW.sfx.serve(); };
  $('#moodWrong').onclick = () => { pat = Math.max(0, pat - 15); flashMood('disgusted'); KW.sfx.fail(); };
  // eyes follow the mouse on the mood stage
  $('#moodStage').addEventListener('mousemove', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const l = Math.round(((e.clientX - r.left) / r.width * 2 - 1) * 2) / 2;
    if (l !== look && !playing) { look = l; renderMood(); }
  });
  renderMood(); renderGallery();

  /* ---------- 4. Order urgency ---------- */
  const fake = (pIdx, rIdx, p, max = 60) => ({ ...FAMILY[pIdx], recipe: RECIPES[rIdx], patience: p, max });
  const noIds = (html) => html.replace(/ id="[^"]*"/g, '');
  $('#tCalm').innerHTML = noIds(KW.ticketHTML(fake(3, 4, 48), 0));
  $('#tWarn').innerHTML = noIds(KW.ticketHTML(fake(0, 3, 18), 1));
  $('#tCrit').innerHTML = noIds(KW.ticketHTML(fake(2, 2, 5), 2));

  let liveT = 20, lastSec = 21;
  const liveM = fake(1, 0, 20, 20);
  function liveStep() {
    liveT -= 0.1; if (liveT < -2) liveT = 20;
    liveM.patience = Math.max(0, liveT);
    const frac = liveM.patience / liveM.max, u = KW.urgencyFor(frac);
    $('#tLive').innerHTML = noIds(KW.ticketHTML(liveM, 0)).replace('ticket ', 'ticket big ');
    $('#urgBox').className = `urg-live-box ph-${liveT <= 0 ? 'gone' : u} ${$('#urgVig').checked ? 'vig' : ''}`;
    $('#urgPhase').innerHTML = liveT <= 0 ? '💢 Mom stormed off! −1 ❤️' : { calm: '😌 Calm – focus on cooking', warn: '😬 Warning – prioritise this order', crit: '🚨 CRITICAL – serve NOW!' }[u];
    const sec = Math.ceil(liveT);
    if (sec !== lastSec) { lastSec = sec; if ($('#urgSound').checked && u === 'crit' && liveT > 0) KW.sfx.tick(); }
  }
  setInterval(liveStep, 100);
  $('#urgRestart').onclick = () => { liveT = 20; };

  /* ---------- 5. Recipe book ---------- */
  const stepFor = (k) => {
    const it = KW.parseKey(k), ing = INGR[it.id];
    const src = ing.source === 'fridge' ? '🧊 Fridge' : '🧺 Counter';
    if (it.state === 'raw') return { ing, it, src, action: 'No prep needed', ut: '' };
    const proc = PROCESS[ing.process];
    const ut = proc.utensil === 'knife' ? '🔪' : `<span class="mini-ut">${UTENSILS[proc.utensil].svg}</span>`;
    return { ing, it, src, action: `${proc.verb} on ${proc.station}`, ut };
  };
  $('#recipeBook').innerHTML = RECIPES.map(r => {
    const steps = r.needs.map(stepFor);
    return `<div class="recipe" tabindex="0">
      <div class="r-face"><span class="r-dish">${r.emoji}</span><b>${r.name}</b>
        <div class="r-eq">${r.needs.map(k => KW.ingIcon(KW.parseKey(k))).join('<i>+</i>')}</div></div>
      <div class="r-steps">
        ${steps.map((s, i) => `<div class="r-step" style="--d:${i * 0.12}s"><span class="r-n">${i + 1}</span><span class="r-e">${s.ing.emoji}</span><div><b>${s.ing.name}</b><small>${s.src} → ${s.action}</small></div><span class="r-ut">${s.ut}</span></div>`).join('')}
        <div class="r-step final" style="--d:${steps.length * 0.12}s"><span class="r-n">✔</span><span class="r-e">🍽️</span><div><b>Plate &amp; serve</b><small>combine on one plate</small></div><span class="r-ut">${r.emoji}</span></div>
      </div></div>`;
  }).join('');
  document.querySelectorAll('.recipe').forEach(c => {
    const toggle = () => c.classList.toggle('flip');
    c.onclick = toggle; c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  });

  /* ---------- 6. Fridge & drawer minis ---------- */
  $('#mfShelf1').innerHTML = ['cheese', 'egg', 'meat'].map(id => `<span title="${INGR[id].name}">${INGR[id].emoji}</span>`).join('');
  $('#mfShelf2').innerHTML = ['tomato', 'lettuce', 'egg'].map(id => `<span title="${INGR[id].name}">${INGR[id].emoji}</span>`).join('');
  $('#mdBox').innerHTML = Object.keys(UTENSILS).map(k => `<span title="${UTENSILS[k].name}">${UTENSILS[k].svg}</span>`).join('');
  $('#smPan').innerHTML = UTENSILS.pan.svg; $('#smPot').innerHTML = UTENSILS.pot.svg;
  const tog = (el, snd) => { const f = () => { el.classList.toggle('open'); snd(); }; el.onclick = f; el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; };
  tog($('#miniFridge'), KW.sfx.pick); tog($('#miniDrawer'), KW.sfx.drop);

  /* ---------- 7. FX playground ---------- */
  const demo = $('#fxDemo'), dish = $('#fxDish');
  const spawnP = (chars, n, cls = '') => {
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = `particle ${cls}`; p.textContent = chars[i % chars.length];
      p.style.left = '50%'; p.style.top = '50%';
      p.style.setProperty('--dx', `${(Math.random() * 2 - 1) * 140}px`);
      p.style.setProperty('--dy', `${-30 - Math.random() * 110}px`);
      p.style.setProperty('--rot', `${(Math.random() * 2 - 1) * 200}deg`);
      demo.appendChild(p); setTimeout(() => p.remove(), 1000);
    }
  };
  const restart = (el, cls, ms) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
  document.querySelectorAll('[data-fx]').forEach(b => b.onclick = () => {
    const fx = b.dataset.fx;
    if (fx === 'serve') { dish.textContent = '🍔'; restart(dish, 'pop', 600); spawnP(['❤️', '✨', '⭐', '🎉'], 16); KW.sfx.serve(); }
    if (fx === 'coins') { spawnP(['🪙'], 12); const f = document.createElement('div'); f.className = 'floater coin'; f.innerHTML = '+36 🪙<small>tip +10 · streak +6</small>'; f.style.left = '50%'; f.style.top = '40%'; demo.appendChild(f); setTimeout(() => f.remove(), 1400); KW.sfx.done(); }
    if (fx === 'burn') { dish.textContent = '🥩'; restart(dish, 'charred', 2500); spawnP(['💨', '🔥', '💨'], 14, 'smoke'); KW.sfx.burn(); }
    if (fx === 'shake') { restart(demo, 'shake', 450); KW.sfx.fail(); }
    if (fx === 'alarm') { restart(demo, 'alarm', 2400); [0, 400, 800, 1200, 1600, 2000].forEach(t => setTimeout(KW.sfx.tick, t)); }
  });
})();
