/* ==========================================================
   Kitchen Warzone – playable layout prototype
   ========================================================== */
(() => {
  const $ = (s) => document.querySelector(s);
  const { INGR, PROCESS, RECIPES, UTENSILS, FAMILY, MOODS } = KW;

  const stage = $('#stage'), kitchen = $('#kitchen'), chefEl = $('#chef'), heldEl = $('#held');
  const pantryEl = $('#pantry'), cookEl = $('#cookzone'), tableEl = $('#table'), ordersEl = $('#orderList');
  const pickerEl = $('#picker'), overlayEl = $('#overlay'), toastsEl = $('#toasts'), fxEl = $('#fx');
  const fridgeEl = $('#fridge');
  chefEl.querySelector('.chef-body').innerHTML = KW.CHEF_SVG;

  const SPEEDS = { relaxed: 0.6, normal: 1, frenzy: 1.45 };
  const CHOP_T = 2.0, FRY_T = 5, BOIL_T = 6, BURN_T = 7, ROUND = 180, REGEN_T = 16, CHEF_SPEED = 780;
  const SEATS = 3;

  let S = null, speed = 'normal', last = 0, dirty = true, slowTick = 0, lastTickSec = -1;

  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rand = (a, b) => a + Math.random() * (b - a);

  function newState() {
    return {
      running: false, paused: false, over: false, t: 0, coins: 0, hearts: 3, served: 0, lost: 0, streak: 0, bestStreak: 0,
      hand: null,
      pantry: Object.fromEntries(KW.PANTRY_IDS.map(id => [id, 3])), regen: 0,
      drawer: { knife: 1, pan: 1, pot: 1 },
      board: { utensil: null, item: null, progress: 0 },
      stoves: [0, 1].map(() => ({ utensil: null, item: null, progress: 0, over: 0 })),
      plates: [0, 1].map(() => ({ present: true, items: [] })),
      seats: Array(SEATS).fill(null), seatTimers: [0.8, 7, 15],
      chef: { x: 0, target: null, action: null, at: null, walking: false, face: 1 },
      roster: shuffle(FAMILY), rosterIdx: 0, picker: null,
    };
  }

  /* ---------------- geometry ---------------- */
  const elFor = (st) => kitchen.querySelector(`[data-st="${st}"]`);
  function stationX(st) {
    const el = elFor(st); if (!el) return S.chef.x;
    const r = el.getBoundingClientRect(), k = kitchen.getBoundingClientRect();
    return r.left + r.width / 2 - k.left;
  }

  /* ---------------- feedback ---------------- */
  function toast(msg, type = 'info') {
    const d = document.createElement('div');
    d.className = `toast t-${type}`; d.innerHTML = msg;
    toastsEl.appendChild(d);
    while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 1700);
    setTimeout(() => d.remove(), 2100);
    if (type === 'err') KW.sfx.err();
  }
  function floatAt(el, html, cls = '') {
    if (!el) return;
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = `floater ${cls}`; d.innerHTML = html;
    d.style.left = `${r.left + r.width / 2 - s.left}px`; d.style.top = `${r.top - s.top + 10}px`;
    fxEl.appendChild(d); setTimeout(() => d.remove(), 1400);
  }
  function burst(el, chars, n = 10) {
    if (!el) return;
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'particle'; p.textContent = chars[i % chars.length];
      p.style.left = `${r.left + r.width / 2 - s.left}px`; p.style.top = `${r.top + r.height / 2 - s.top}px`;
      p.style.setProperty('--dx', `${rand(-90, 90)}px`); p.style.setProperty('--dy', `${rand(-120, -30)}px`);
      p.style.setProperty('--rot', `${rand(-180, 180)}deg`);
      fxEl.appendChild(p); setTimeout(() => p.remove(), 1000);
    }
  }
  function shake() { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }

  /* ---------------- interaction ---------------- */
  function request(st) {
    if (!S.running || S.paused || S.over) return;
    if (S.picker && st !== S.picker) closePicker();
    const x = stationX(st);
    S.chef.target = x; S.chef.action = st; S.chef.at = null;
    if (Math.abs(x - S.chef.x) < 4) arrive();
  }
  function arrive() {
    const st = S.chef.action;
    S.chef.x = S.chef.target; S.chef.target = null; S.chef.action = null; S.chef.at = st; S.chef.walking = false;
    perform(st); dirty = true;
  }

  function perform(st) {
    if (st.startsWith('pantry:')) return pantryAct(st.split(':')[1]);
    if (st === 'fridge' || st === 'drawer') return containerAct(st);
    if (st === 'board') return boardAct();
    if (st.startsWith('stove')) return stoveAct(+st.slice(5));
    if (st.startsWith('plate')) return plateAct(+st.slice(5));
    if (st === 'trash') return trashAct();
    if (st.startsWith('seat')) return serveAct(+st.slice(4));
  }

  const handFull = () => toast('✋ Hands full! Put it on a plate, a station or in the bin.', 'err');

  function pantryAct(id) {
    if (S.hand) return handFull();
    if (S.pantry[id] <= 0) return toast(`Out of ${INGR[id].emoji} ${INGR[id].name}! ${KW.FRIDGE_IDS.includes(id) ? 'Grab some from the fridge.' : 'Wait for the restock…'}`, 'err');
    S.pantry[id]--; S.hand = { kind: 'ing', id, state: 'raw' }; KW.sfx.pick();
  }

  function containerAct(kind) {
    const h = S.hand;
    if (kind === 'drawer' && h && h.kind === 'utensil') {
      S.drawer[h.id]++; S.hand = null; KW.sfx.drop();
      return toast(`${UTENSILS[h.id].name} returned to the drawer.`);
    }
    if (h) return handFull();
    openPicker(kind);
  }

  function openPicker(kind) {
    S.picker = kind;
    let html = '';
    if (kind === 'fridge') {
      fridgeEl.classList.add('open');
      html = `<div class="pk-title">🧊 Refrigerator</div><div class="pk-items">` +
        KW.FRIDGE_IDS.map(id => `<button class="pk-item" data-pick="ing:${id}"><span>${INGR[id].emoji}</span>${INGR[id].name}</button>`).join('') + '</div>';
    } else {
      html = `<div class="pk-title">🗄️ Utensil drawer</div><div class="pk-items">` +
        Object.keys(UTENSILS).map(id => `<button class="pk-item ${S.drawer[id] ? '' : 'none'}" data-pick="ut:${id}"><span class="pk-ut">${UTENSILS[id].svg}</span>${UTENSILS[id].name}<small>${S.drawer[id] ? '→ ' + UTENSILS[id].for : 'in use'}</small></button>`).join('') + '</div>';
    }
    pickerEl.innerHTML = html + `<button class="pk-close" data-pick="close">✕</button>`;
    pickerEl.hidden = false;
    const el = elFor(kind), r = el.getBoundingClientRect(), k = kitchen.getBoundingClientRect();
    const w = 300;
    let left = r.left - k.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(k.width - w - 8, left));
    pickerEl.style.left = `${left}px`;
    pickerEl.style.top = kind === 'fridge' ? `${r.bottom - k.top + 8}px` : `${r.top - k.top - 8}px`;
    pickerEl.classList.toggle('above', kind !== 'fridge');
    KW.sfx.pick();
  }
  function closePicker() { S.picker = null; pickerEl.hidden = true; fridgeEl.classList.remove('open'); }
  function pick(val) {
    if (val === 'close') return closePicker();
    const [type, id] = val.split(':');
    if (S.hand) return handFull();
    if (type === 'ing') S.hand = { kind: 'ing', id, state: 'raw' };
    else { if (!S.drawer[id]) return toast(`The ${UTENSILS[id].name.toLowerCase()} is already in use – take it off its station first.`, 'err'); S.drawer[id]--; S.hand = { kind: 'utensil', id }; }
    KW.sfx.pick(); closePicker(); dirty = true;
  }

  function addToPlate(items, it) {
    if (it.state === 'burnt') { toast('💨 Burnt food can\'t be served – throw it in the bin!', 'err'); return false; }
    const proc = INGR[it.id].process;
    if (proc && it.state === 'raw') { toast(`Raw ${INGR[it.id].emoji}! ${PROCESS[proc].verb} it first on the ${PROCESS[proc].station} (${PROCESS[proc].utensil}).`, 'err'); return false; }
    if (items.length >= 3) { toast('Plate is full (max 3 items).', 'err'); return false; }
    items.push(it); KW.sfx.drop();
    const r = KW.matchRecipe(items);
    if (r) toast(`${r.emoji} <b>${r.name}</b> is ready – serve it!`, 'ok');
    return true;
  }

  function boardAct() {
    const b = S.board, h = S.hand;
    if (h && h.kind === 'utensil') {
      if (h.id !== 'knife') return toast(`The ${UTENSILS[h.id].name.toLowerCase()} goes on a stove, not the cutting board.`, 'err');
      if (b.utensil) return toast('There is already a knife here.', 'err');
      b.utensil = 'knife'; S.hand = null; KW.sfx.drop(); return toast('🔪 Knife ready – you can chop now!', 'ok');
    }
    if (!b.utensil) return toast('No knife! Grab one from the 🗄️ utensil drawer.', 'err');
    if (b.item) {
      if (b.item.state === 'raw') return h ? toast('Board is busy – finish chopping first.', 'err') : null;
      if (!h) { S.hand = b.item; b.item = null; KW.sfx.pick(); return; }
      if (h.kind === 'plate') { if (addToPlate(h.items, b.item)) b.item = null; return; }
      return handFull();
    }
    if (!h) { S.hand = { kind: 'utensil', id: 'knife' }; b.utensil = null; return toast('You picked up the knife.'); }
    if (h.kind !== 'ing') return toast('Only ingredients can be chopped.', 'err');
    if (INGR[h.id].process !== 'chop') return toast(`${INGR[h.id].emoji} doesn't need chopping${INGR[h.id].process ? ` – ${PROCESS[INGR[h.id].process].verb.toLowerCase()} it on a stove with a ${PROCESS[INGR[h.id].process].utensil}` : ''}.`, 'err');
    if (h.state !== 'raw') return toast('Already chopped!', 'err');
    b.item = h; b.progress = 0; S.hand = null; KW.sfx.drop();
  }

  function stoveAct(i) {
    const s = S.stoves[i], h = S.hand;
    if (h && h.kind === 'utensil') {
      if (h.id === 'knife') return toast('🔪 The knife belongs on the cutting board.', 'err');
      if (s.utensil) return toast('This stove already has something on it.', 'err');
      s.utensil = h.id; S.hand = null; KW.sfx.drop(); return toast(`${UTENSILS[h.id].name} on stove ${i + 1}.`, 'ok');
    }
    if (!s.utensil) return toast('Empty stove! Put a frying pan or a pot on it (🗄️ utensil drawer).', 'err');
    if (s.item) {
      if (s.item.state === 'raw') return toast('Still cooking… 🔥', 'err');
      if (!h) { S.hand = s.item; s.item = null; KW.sfx.pick(); return; }
      if (h.kind === 'plate' && s.item.state !== 'burnt') { if (addToPlate(h.items, s.item)) s.item = null; return; }
      return handFull();
    }
    if (!h) { S.hand = { kind: 'utensil', id: s.utensil }; s.utensil = null; return toast(`You took the ${UTENSILS[S.hand.id].name.toLowerCase()} off the stove.`); }
    if (h.kind !== 'ing') return toast('Put ingredients in the pan/pot, not plates.', 'err');
    const need = s.utensil === 'pan' ? 'fry' : 'boil', proc = INGR[h.id].process;
    if (proc !== need) {
      if (proc === 'fry' || proc === 'boil') return toast(`${INGR[h.id].emoji} needs a ${PROCESS[proc].utensil === 'pan' ? 'frying pan' : 'pot'} – swap the utensil or use the other stove.`, 'err');
      return toast(`${INGR[h.id].emoji} ${INGR[h.id].name} can't be cooked${proc === 'chop' ? ' – chop it on the cutting board' : ''}.`, 'err');
    }
    if (h.state !== 'raw') return toast('Already cooked!', 'err');
    s.item = h; s.progress = 0; s.over = 0; S.hand = null; KW.sfx.drop();
  }

  function plateAct(i) {
    const p = S.plates[i], h = S.hand;
    if (!p.present) {
      if (h && h.kind === 'plate') { p.present = true; p.items = h.items; S.hand = null; KW.sfx.drop(); return; }
      return toast('This plate is in your hands or on its way.', 'err');
    }
    if (!h) {
      if (!p.items.length) return toast('Empty plate – add prepared ingredients first.', 'err');
      S.hand = { kind: 'plate', items: p.items }; p.present = false; p.items = []; KW.sfx.pick(); return;
    }
    if (h.kind === 'ing') { if (addToPlate(p.items, h)) S.hand = null; return; }
    if (h.kind === 'plate') return handFull();
    return toast('Utensils go on stations, not plates.', 'err');
  }

  function trashAct() {
    const h = S.hand;
    if (!h) return toast('Nothing to throw away.', 'err');
    if (h.kind === 'utensil') return toast('Don\'t bin the utensils! Return them to the drawer.', 'err');
    if (h.kind === 'plate') { if (!h.items.length) return toast('Plate is already empty.'); h.items = []; }
    else S.hand = null;
    burst(elFor('trash'), ['💨', '🗑️'], 5); KW.sfx.drop();
  }

  function serveAct(i) {
    const m = S.seats[i], h = S.hand;
    if (!m || m.state !== 'waiting') return toast('Nobody is waiting there.', 'err');
    if (!h || h.kind !== 'plate') return toast(`${m.name} wants <b>${m.recipe.emoji} ${m.recipe.name}</b>. Bring a finished plate!`, 'err');
    const r = KW.matchRecipe(h.items);
    const seatEl = $(`#seat${i}`);
    if (r && r.id === m.recipe.id) {
      const frac = m.patience / m.max, mood = KW.moodFor(frac);
      const tip = { happy: 10, peckish: 6, hungry: 3, hangry: 0 }[mood];
      S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
      const bonus = Math.min(10, (S.streak - 1) * 2);
      const total = 20 + tip + bonus;
      S.coins += total; S.served++;
      m.state = 'served'; m.leaveT = 2.2;
      const slot = S.plates.find(p => !p.present); if (slot) { slot.present = true; slot.items = []; }
      S.hand = null;
      floatAt(seatEl, `+${total} 🪙${tip ? `<small>tip +${tip}${bonus ? ` · streak +${bonus}` : ''}</small>` : ''}`, 'coin');
      burst(seatEl, ['❤️', '✨', '🪙', '⭐'], 14);
      KW.sfx.serve();
      toast(`${m.name}: "${['Yum!', 'Finally!', 'Delicious!', 'You\'re the best!'][Math.floor(Math.random() * 4)]}"`, 'ok');
    } else {
      m.patience = Math.max(0.5, m.patience - m.max * 0.15); m.flash = 1.4; S.streak = 0;
      floatAt(seatEl, '−15% patience', 'bad'); KW.sfx.fail(); shake();
      toast(`That's not what ${m.name} ordered! They want ${m.recipe.emoji} ${m.recipe.name}.`, 'err');
    }
  }

  /* ---------------- members ---------------- */
  function spawn(i) {
    const p = S.roster[S.rosterIdx++ % S.roster.length];
    if (S.rosterIdx % S.roster.length === 0) S.roster = shuffle(FAMILY);
    if (S.seats.some(m => m && m.id === p.id)) return (S.seatTimers[i] = 0.5);
    let pool = RECIPES;
    if (S.served === 0 && S.t < 10) pool = RECIPES.filter(r => r.id === 'salad' || r.id === 'eggtoast');
    const taken = S.seats.filter(Boolean).map(m => m.recipe.id);
    const fresh = pool.filter(r => !taken.includes(r.id));
    const recipe = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))];
    const max = p.patience * (1 - 0.3 * Math.min(1, S.t / ROUND)) + recipe.needs.length * 4;
    S.seats[i] = { ...p, recipe, max, patience: max, state: 'waiting', mood: 'happy', look: 0, flash: 0, leaveT: 0, enter: 0.5 };
    KW.sfx.pick(); dirty = true;
  }

  /* ---------------- update loop ---------------- */
  function update(dt) {
    const spd = SPEEDS[speed];
    S.t += dt;

    // chef movement
    const c = S.chef;
    if (c.target != null) {
      const dx = c.target - c.x, step = CHEF_SPEED * dt;
      c.walking = true; c.face = dx >= 0 ? 1 : -1;
      if (Math.abs(dx) <= step) arrive(); else c.x += Math.sign(dx) * step;
    }

    // chopping (only while standing at board)
    const b = S.board;
    const chopping = b.item && b.item.state === 'raw' && c.at === 'board' && c.target == null;
    if (chopping) {
      const before = Math.floor(b.progress * 8);
      b.progress += dt / CHOP_T;
      if (Math.floor(b.progress * 8) !== before) KW.sfx.chop();
      if (b.progress >= 1) { b.item.state = 'chopped'; b.progress = 1; KW.sfx.done(); burst(elFor('board'), ['✨'], 4); dirty = true; }
    }
    chefEl.classList.toggle('chopping', !!chopping);

    // stoves
    S.stoves.forEach((s, i) => {
      if (!s.item) return;
      if (s.item.state === 'raw') {
        s.progress += dt / (s.utensil === 'pan' ? FRY_T : BOIL_T);
        if (s.progress >= 1) { s.item.state = s.utensil === 'pan' ? 'fried' : 'boiled'; s.progress = 1; s.over = 0; KW.sfx.done(); burst(elFor(`stove${i}`), ['✨'], 4); dirty = true; }
      } else if (s.item.state !== 'burnt') {
        s.over += dt / BURN_T;
        if (s.over >= 1) {
          s.item.state = 'burnt'; dirty = true; KW.sfx.burn(); shake();
          burst(elFor(`stove${i}`), ['💨', '🔥', '💨'], 12);
          toast(`🔥 ${INGR[s.item.id].name} BURNT on stove ${i + 1}! Bin it.`, 'err');
        }
      }
    });

    // pantry restock
    S.regen += dt;
    if (S.regen >= REGEN_T) {
      S.regen = 0;
      const low = KW.PANTRY_IDS.filter(id => S.pantry[id] < 3);
      if (low.length) { const id = low[Math.floor(Math.random() * low.length)]; S.pantry[id]++; dirty = true; floatAt(elFor(`pantry:${id}`), `+1 ${INGR[id].emoji}`, 'small'); }
    }

    // members
    let anyCrit = false, critSec = null;
    S.seats.forEach((m, i) => {
      if (!m) {
        S.seatTimers[i] -= dt * spd;
        if (S.seatTimers[i] <= 0 && S.t < ROUND - 8) spawn(i);
        return;
      }
      if (m.enter > 0) m.enter -= dt;
      if (m.flash > 0) { m.flash -= dt; if (m.flash <= 0) dirty = true; }
      if (m.state === 'waiting') {
        m.patience -= dt * spd;
        const frac = m.patience / m.max;
        if (frac < 0.2) { anyCrit = true; critSec = Math.ceil(m.patience); }
        const mood = KW.moodFor(frac);
        if (mood !== m.mood) {
          m.mood = mood; dirty = true;
          if (mood === 'hungry') floatAt($(`#seat${i}`), 'GRRR…', 'small');
          if (mood === 'hangry') { floatAt($(`#seat${i}`), '😤 HURRY UP!', 'bad'); KW.sfx.fail(); }
        }
        if (m.patience <= 0) {
          m.state = 'leaving'; m.mood = 'left'; m.leaveT = 2.2; S.hearts--; S.lost++; S.streak = 0; dirty = true;
          shake(); KW.sfx.fail(); floatAt($(`#seat${i}`), '−1 ❤️', 'bad');
          toast(`💢 ${m.name} stormed off hungry!`, 'err');
        }
        // eyes follow the chef
        const sx = stationX(`seat${i}`);
        const look = Math.max(-1, Math.min(1, (c.x - sx) / 250));
        const q = Math.round(look * 2) / 2;
        if (q !== m.look) { m.look = q; const f = $(`#face${i}`); if (f) f.innerHTML = KW.drawCharacter(m, m.flash > 0 ? 'disgusted' : m.mood, q); }
      } else {
        m.leaveT -= dt;
        if (m.leaveT <= 0) { S.seats[i] = null; S.seatTimers[i] = rand(2.5, 6) / Math.max(0.8, 0.8 + S.t / ROUND); dirty = true; }
      }
    });
    stage.classList.toggle('danger', anyCrit);
    if (anyCrit && critSec !== lastTickSec) { lastTickSec = critSec; KW.sfx.tick(); }

    if (S.hearts <= 0) return gameOver(false);
    if (S.t >= ROUND) return gameOver(true);
  }

  /* ---------------- rendering ---------------- */
  function heldHTML(h) {
    if (!h) return '';
    if (h.kind === 'ing') return KW.ingIcon(h);
    if (h.kind === 'utensil') return `<span class="held-ut">${UTENSILS[h.id].svg}</span>`;
    return `<span class="plate mini">${plateInner(h.items)}</span>`;
  }
  function plateInner(items) {
    const r = KW.matchRecipe(items);
    if (r) return `<span class="dish">${r.emoji}</span>`;
    return `<span class="plate-items">${items.map(it => KW.ingIcon(it)).join('')}</span>`;
  }

  function renderPantry() {
    const slots = KW.PANTRY_IDS.map(id => {
      const n = S.pantry[id];
      return `<button class="st slot ${n ? '' : 'empty'}" data-st="pantry:${id}">
        <span class="slot-e">${INGR[id].emoji}</span>
        <span class="stock">${'<i></i>'.repeat(n)}${'<i class="o"></i>'.repeat(3 - n)}</span>
        <span class="st-label">${INGR[id].name}</span></button>`;
    }).join('');
    const b = S.board;
    const drawerIcons = Object.keys(S.drawer).filter(k => S.drawer[k]).map(k => `<span class="di">${UTENSILS[k].svg}</span>`).join('') || '<small>empty</small>';
    pantryEl.innerHTML = slots +
      `<button class="st drawer ${S.picker === 'drawer' ? 'open' : ''}" data-st="drawer" data-area="drawer">
         <span class="drawer-front"><i></i></span><span class="drawer-icons">${drawerIcons}</span><span class="st-label">Utensil drawer</span></button>
       <button class="st board ${b.utensil ? '' : 'no-ut'}" data-st="board">
         <span class="board-wood">${b.utensil ? '<span class="knife">🔪</span>' : '<span class="need">needs 🔪</span>'}${b.item ? `<span class="board-item">${KW.ingIcon(b.item)}</span>` : ''}</span>
         <span class="pbar ${b.item && b.item.state === 'raw' ? '' : 'hide'}"><i id="boardBar"></i></span>
         <span class="st-label">Cutting board</span></button>
       <button class="st trash" data-st="trash"><span class="slot-e">🗑️</span><span class="st-label">Bin</span></button>`;
  }

  function renderCook() {
    const stoves = S.stoves.map((s, i) => {
      const cooking = s.item && s.item.state === 'raw';
      return `<button class="st stove ${cooking ? 'cooking' : ''} ${s.item && s.item.state === 'burnt' ? 'burnt' : ''}" data-st="stove${i}" id="st-stove${i}">
        <span class="burner ${cooking || (s.item && s.item.state !== 'burnt') ? 'on' : ''}"></span>
        ${s.utensil ? `<span class="ut on-stove ut-${s.utensil}">${UTENSILS[s.utensil].svg}</span>` : '<span class="need">empty stove</span>'}
        ${s.item ? `<span class="cooking-item">${KW.ingIcon(s.item)}</span>` : ''}
        <span class="pbar ${s.item && s.item.state !== 'burnt' ? '' : 'hide'}"><i id="stoveBar${i}"></i></span>
        <span class="st-label">Stove ${i + 1}${s.utensil ? ' · ' + (s.utensil === 'pan' ? 'fry' : 'boil') : ''}</span></button>`;
    }).join('');
    const plates = S.plates.map((p, i) => {
      const r = p.present && KW.matchRecipe(p.items);
      return `<button class="st plate-st ${r ? 'ready' : ''}" data-st="plate${i}">
        ${p.present ? `<span class="plate">${plateInner(p.items)}</span>` : '<span class="plate gone"></span>'}
        <span class="st-label">${r ? '✔ ' + r.name : 'Plate ' + (i + 1)}</span></button>`;
    }).join('');
    cookEl.innerHTML = stoves + plates;
  }

  function renderTable() {
    tableEl.innerHTML = `<div class="table-top"></div>` + S.seats.map((m, i) => {
      if (!m) return `<button class="seat empty" data-st="seat${i}" id="seat${i}"><span class="chair">🪑</span><small>Empty seat</small></button>`;
      const frac = Math.max(0, m.patience / m.max), u = KW.urgencyFor(frac);
      const mood = m.state === 'served' ? 'delighted' : m.flash > 0 ? 'disgusted' : m.mood;
      return `<button class="seat ${m.state} ${m.enter > 0 ? 'enter' : ''}" data-st="seat${i}" id="seat${i}">
        ${m.state === 'waiting' ? `<span class="bubble u-${u}"><span class="b-dish">${m.recipe.emoji}</span><span class="bub-bar"><b id="patBar${i}"></b></span></span>` : ''}
        <span class="member mood-${mood}"><span class="face" id="face${i}">${KW.drawCharacter(m, mood, m.look)}</span><span class="mfx"></span></span>
        <span class="nametag" style="--mc:${MOODS[mood].color}">${m.name}<em>${MOODS[mood].icon} ${MOODS[mood].label}</em></span>
      </button>`;
    }).join('');
  }

  function renderOrders() {
    const list = S.seats.map((m, i) => ({ m, i })).filter(o => o.m && o.m.state === 'waiting').sort((a, b) => a.m.patience - b.m.patience);
    ordersEl.innerHTML = list.length ? list.map(o => KW.ticketHTML(o.m, o.i)).join('') : '<div class="no-orders">No orders yet…<br>enjoy the calm 😌</div>';
  }

  function renderHUD() {
    $('#hudTime').textContent = KW.fmt(ROUND - S.t);
    $('#hudTime').classList.toggle('low', ROUND - S.t < 30);
    $('#hudCoins').textContent = `${S.coins} 🪙`;
    $('#hudHearts').textContent = '❤️'.repeat(Math.max(0, S.hearts)) + '🖤'.repeat(3 - Math.max(0, S.hearts));
    $('#hudStreak').textContent = `x${S.streak}`;
  }

  function renderAll() {
    renderPantry(); renderCook(); renderTable(); renderOrders();
    heldEl.innerHTML = heldHTML(S.hand);
    heldEl.classList.toggle('has', !!S.hand);
    dirty = false;
  }

  function updateBars() {
    const b = S.board, bb = $('#boardBar');
    if (bb) bb.style.width = `${(b.item ? b.progress : 0) * 100}%`;
    S.stoves.forEach((s, i) => {
      const el = $(`#stoveBar${i}`); if (!el) return;
      const done = s.item && s.item.state !== 'raw';
      el.style.width = `${(done ? s.over : s.progress) * 100}%`;
      el.classList.toggle('burning', !!done);
      const st = $(`#st-stove${i}`); if (st) st.classList.toggle('danger', done && s.over > 0.45 && s.item.state !== 'burnt');
    });
    S.seats.forEach((m, i) => {
      if (!m || m.state !== 'waiting') return;
      const frac = Math.max(0, m.patience / m.max), u = KW.urgencyFor(frac);
      const pb = $(`#patBar${i}`); if (pb) { pb.style.width = `${frac * 100}%`; pb.parentElement.parentElement.className = `bubble u-${u}`; }
      const ot = $(`#ordT${i}`); if (ot) ot.textContent = `(${Math.ceil(m.patience)})`;
      const ob = $(`#ordBar${i}`); if (ob) { ob.style.width = `${frac * 100}%`; ob.closest('.ticket').className = `ticket u-${u}`; }
    });
    const c = S.chef;
    chefEl.style.transform = `translateX(${c.x - 45}px)`;
    chefEl.classList.toggle('walking', c.target != null);
    chefEl.classList.toggle('flip', c.face < 0);
    renderHUD();
  }

  function hint() {
    const h = S.hand, b = S.board;
    const waiting = S.seats.filter(m => m && m.state === 'waiting').sort((a, z) => a.patience - z.patience);
    if (h && h.kind === 'utensil') return h.id === 'knife' ? 'Put the knife on the <b>cutting board</b>.' : `Put the ${UTENSILS[h.id].name.toLowerCase()} on an empty <b>stove</b>.`;
    if (h && h.kind === 'plate') {
      const r = KW.matchRecipe(h.items);
      const who = r && waiting.find(m => m.recipe.id === r.id);
      if (who) return `Serve the ${r.emoji} to <b>${who.name}</b> – click them at the table!`;
      return r ? `Nobody ordered ${r.emoji} ${r.name}… put it down or bin it.` : 'Add more prepared ingredients to this plate, or put it back.';
    }
    if (h && h.kind === 'ing') {
      if (h.state === 'burnt') return 'Burnt! Take it to the 🗑️ <b>bin</b>.';
      const proc = INGR[h.id].process;
      if (proc && h.state === 'raw') return `${PROCESS[proc].verb} the ${INGR[h.id].emoji} on the <b>${PROCESS[proc].station}</b> (needs a ${PROCESS[proc].utensil}).`;
      return `Drop the ${INGR[h.id].emoji} on a <b>plate</b> to build the dish.`;
    }
    if (!b.utensil && S.drawer.knife) return 'Set up: open the 🗄️ <b>utensil drawer</b> and put the knife on the cutting board.';
    if (S.stoves.every(s => !s.utensil) && (S.drawer.pan || S.drawer.pot)) return 'Set up: put a <b>pan</b> and a <b>pot</b> from the drawer on the stoves.';
    if (b.item && b.item.state === 'raw') return 'Stay at the <b>cutting board</b> to keep chopping!';
    const burning = S.stoves.findIndex(s => s.item && s.item.state !== 'raw' && s.item.state !== 'burnt' && s.over > 0.3);
    if (burning >= 0) return `⚠️ Stove ${burning + 1} is about to burn – take it off!`;
    if (waiting.length) {
      const m = waiting[0];
      const need = m.recipe.needs.map(k => { const it = KW.parseKey(k); return INGR[it.id].emoji + (it.state !== 'raw' ? `(${it.state})` : ''); }).join(' + ');
      return `Most urgent: <b>${m.recipe.emoji} ${m.recipe.name}</b> for ${m.name} = ${need}`;
    }
    return 'Waiting for the family to sit down… prep your stations!';
  }

  /* ---------------- overlay screens ---------------- */
  function showStart() {
    overlayEl.innerHTML = `<div class="ov-card">
      <h2>Dinner rush!</h2>
      <p>The family is coming home <b>starving</b>. Keep them fed for <b>3 minutes</b>.</p>
      <ol class="ov-steps">
        <li>🗄️ Set up utensils: knife → board, pan/pot → stoves</li>
        <li>🧺 Grab ingredients (counter or 🧊 fridge)</li>
        <li>🔪🔥💧 Chop, fry or boil them</li>
        <li>🍽️ Combine on a plate &amp; click the family member to serve</li>
      </ol>
      <p class="ov-small">If 3 people storm off hungry, the shift is over.</p>
      <button class="btn btn-big" id="btnStart">▶ Open the kitchen</button></div>`;
    overlayEl.classList.add('show');
    $('#btnStart').onclick = start;
  }
  function start() {
    S = newState(); S.running = true;
    overlayEl.classList.remove('show'); closePicker();
    renderAll();
    S.chef.x = stationX('board');
    last = performance.now();
  }
  function togglePause(force) {
    if (!S || !S.running || S.over) return;
    S.paused = force != null ? force : !S.paused;
    $('#btnPause').textContent = S.paused ? '▶' : '⏸';
    if (S.paused) {
      overlayEl.innerHTML = `<div class="ov-card"><h2>Paused</h2><p>The family is (impatiently) frozen in time.</p><button class="btn btn-big" id="btnResume">▶ Resume</button></div>`;
      overlayEl.classList.add('show'); $('#btnResume').onclick = () => togglePause(false);
    } else { overlayEl.classList.remove('show'); last = performance.now(); }
  }
  function gameOver(survived) {
    S.over = true; S.running = false; stage.classList.remove('danger'); closePicker();
    const stars = S.coins >= 300 ? 3 : S.coins >= 180 ? 2 : S.coins >= 80 ? 1 : 0;
    overlayEl.innerHTML = `<div class="ov-card">
      <h2>${survived ? 'Shift complete!' : 'Family mutiny!'}</h2>
      <div class="stars">${'⭐'.repeat(stars)}${'<span class="dim">⭐</span>'.repeat(3 - stars)}</div>
      <div class="ov-stats"><div><b>${S.coins}</b>coins</div><div><b>${S.served}</b>served</div><div><b>${S.lost}</b>stormed off</div><div><b>x${S.bestStreak}</b>best streak</div></div>
      <p class="ov-small">${survived ? 'Everyone went to bed with a full belly (mostly).' : 'Three family members left the table hungry. Try 🐢 Relaxed speed to practise.'}</p>
      <button class="btn btn-big" id="btnAgain">↻ Play again</button></div>`;
    overlayEl.classList.add('show');
    $('#btnAgain').onclick = start;
    renderHUD();
  }

  /* ---------------- main loop ---------------- */
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (S.running && !S.paused && !S.over) {
      update(dt);
      slowTick += dt;
      if (slowTick > 0.3) { slowTick = 0; renderOrders(); const t = hint(); const tt = $('#tipText'); if (tt.innerHTML !== t) tt.innerHTML = t; }
    }
    if (dirty) renderAll();
    updateBars();
    requestAnimationFrame(loop);
  }

  /* ---------------- events ---------------- */
  stage.addEventListener('click', (e) => {
    const pk = e.target.closest('[data-pick]');
    if (pk) { if (!pk.classList.contains('none') || pk.dataset.pick === 'close') pick(pk.dataset.pick); return; }
    const st = e.target.closest('[data-st]');
    if (st) request(st.dataset.st);
  });
  document.querySelectorAll('#speedSeg button').forEach(b => b.onclick = () => {
    speed = b.dataset.speed;
    document.querySelectorAll('#speedSeg button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#btnPause').onclick = () => togglePause();
  $('#btnRestart').onclick = () => { if (S && S.paused) togglePause(false); start(); };
  $('#btnSound').onclick = () => { KW.sfx.muted = !KW.sfx.muted; $('#btnSound').textContent = KW.sfx.muted ? '🔇' : '🔊'; };
  document.addEventListener('keydown', (e) => {
    if (!S || !S.running) return;
    if (e.key === 'p' || e.key === 'P') togglePause();
    if (e.key === 'Escape') closePicker();
    if (e.key === 'q' || e.key === 'Q') request('trash');
  });
  // auto-pause when the game scrolls out of view or tab hidden
  document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });
  new IntersectionObserver((ents) => ents.forEach(en => { if (!en.isIntersecting && S && S.running && !S.paused) togglePause(true); }), { threshold: 0.15 }).observe(stage);
  window.addEventListener('resize', () => { if (S && S.chef.at) S.chef.x = stationX(S.chef.at); });

  /* ---------------- API for the doc ---------------- */
  KW.highlight = (area) => {
    const map = { orders: '#ordersPanel', player: '#chef', ingredients: '#pantry', cookzone: '#cookzone', fridge: '#fridge', members: '#table', drawer: '[data-st="drawer"]' };
    const el = $(map[area]); if (!el) return;
    stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { el.classList.remove('spotlight'); void el.offsetWidth; el.classList.add('spotlight'); setTimeout(() => el.classList.remove('spotlight'), 2600); }, 450);
  };

  // boot: idle preview state with sample family
  S = newState();
  S.seats = [0, 1, 2].map(i => ({ ...FAMILY[i], recipe: RECIPES[i * 2], max: 60, patience: [52, 30, 9][i], state: 'waiting', mood: KW.moodFor([52, 30, 9][i] / 60), look: 0, flash: 0, enter: 0 }));
  renderAll();
  requestAnimationFrame(() => { S.chef.x = stationX('board'); });
  showStart();
  requestAnimationFrame(loop);
})();
