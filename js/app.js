(() => {
  'use strict';
  const KEY = 'routineTracker.v1', THEME_KEY = 'routineTracker.theme';
  const $ = (id) => document.getElementById(id);
  const el = { greeting: $('greeting'), today: $('today'), streakNum: $('streakNum'), streakBadge: $('streakBadge'),
    ring: $('ring'), doneCount: $('doneCount'), bestNum: $('bestNum'), activeDays: $('activeDays'),
    motivation: $('motivation'), form: $('addForm'), input: $('taskInput'), tabs: $('tabs'), tabBar: $('tabBar'),
    list: $('list'), empty: $('empty'), week: $('week'), toast: $('toast'), theme: $('themeBtn'),
    cActive: $('cActive'), cCompleted: $('cCompleted'), cAll: $('cAll') };
  const CHECK = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 5"/></svg>';
  const RING = 119.4;

  // ---------- storage ----------
  const load = () => {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.tasks)) return d; } catch (e) {}
    return { tasks: [], history: {}, best: 0 };
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
  let state = load();
  let tab = 'active', lastStreak = null;

  // ---------- dates ----------
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = () => keyOf(new Date());
  let currentDay = todayKey();

  // ---------- tasks ----------
  const isDone = (t) => t.doneDate === todayKey();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function syncHistory() {
    const done = state.tasks.filter(isDone).length;
    state.history[todayKey()] = { done, total: state.tasks.length };
  }
  const isActiveDay = (k) => state.history[k] && state.history[k].done >= 1;

  // ---------- streak (one completed task = day counts) ----------
  function calcStreak() {
    const d = new Date();
    if (!isActiveDay(keyOf(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (isActiveDay(keyOf(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- render ----------
  function renderHeader() {
    const h = new Date().getHours();
    el.greeting.textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    el.today.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function renderStats() {
    syncHistory();
    const total = state.tasks.length, done = state.tasks.filter(isDone).length;
    const streak = calcStreak();
    if (streak > state.best) state.best = streak;
    save();

    el.streakNum.textContent = streak;
    if (lastStreak !== null && streak > lastStreak) {
      el.streakBadge.classList.remove('bump'); void el.streakBadge.offsetWidth; el.streakBadge.classList.add('bump');
      toast(`${streak} day streak! Keep going`);
    }
    lastStreak = streak;

    el.doneCount.textContent = `${done}/${total}`;
    el.ring.style.strokeDashoffset = RING - (total ? done / total : 0) * RING;
    el.bestNum.textContent = `${state.best} ${state.best === 1 ? 'day' : 'days'}`;
    el.activeDays.textContent = Object.keys(state.history).filter(isActiveDay).length;
    el.cActive.textContent = total - done; el.cCompleted.textContent = done; el.cAll.textContent = total;

    el.motivation.textContent = !total ? 'Add your first task to start building a streak.'
      : done === 0 ? 'Complete one task today to keep your streak alive.'
      : done === total ? 'All tasks done. Great work today.'
      : `${total - done} to go. You already kept your streak today.`;
    renderWeek();
  }

  function renderWeek() {
    el.week.innerHTML = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const div = document.createElement('div');
      div.className = 'day' + (isActiveDay(keyOf(d)) ? ' hit' : '') + (i === 0 ? ' today' : '');
      div.innerHTML = '<i></i>' + (i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }));
      el.week.appendChild(div);
    }
  }

  function renderList() {
    const items = state.tasks.filter((t) => tab === 'all' || (tab === 'completed') === isDone(t));
    el.list.innerHTML = '';
    items.forEach((t) => el.list.appendChild(taskNode(t)));
    el.empty.hidden = items.length > 0;
    if (!items.length) {
      const msg = { active: ['No active tasks', state.tasks.length ? 'Everything is done for today.' : 'Add a task above to get started.'],
        completed: ['Nothing completed yet', 'Finish a task and it shows up here.'],
        all: ['No tasks yet', 'Add a task above to get started.'] }[tab];
      el.empty.innerHTML = `<b>${msg[0]}</b>${msg[1]}`;
    }
  }

  function taskNode(t) {
    const li = document.createElement('li');
    li.className = 'item' + (isDone(t) ? ' done' : '');
    li.dataset.id = t.id;
    const check = document.createElement('button');
    check.className = 'check'; check.innerHTML = CHECK;
    check.setAttribute('aria-label', 'Toggle complete');
    const title = document.createElement('span');
    title.className = 'title'; title.textContent = t.title;
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×'; del.setAttribute('aria-label', 'Delete task');
    li.append(check, title, del);
    return li;
  }

  function moveTab(btn) {
    el.tabBar.style.left = btn.offsetLeft + 'px';
    el.tabBar.style.width = btn.offsetWidth + 'px';
  }

  // ---------- actions ----------
  function addTask(title) {
    state.tasks.push({ id: uid(), title, doneDate: null, createdAt: Date.now() });
    save(); renderStats(); renderList();
  }

  function toggle(li) {
    if (li.classList.contains('leaving')) return;
    const t = state.tasks.find((x) => x.id === li.dataset.id);
    if (!t) return;
    const nowDone = !isDone(t);
    t.doneDate = nowDone ? todayKey() : null;
    li.classList.toggle('done', nowDone);
    if (nowDone) toast('Task completed');
    renderStats();
    if (tab === 'all') return;
    li.classList.add('leaving');
    setTimeout(renderList, 380);
  }

  function remove(li) {
    state.tasks = state.tasks.filter((x) => x.id !== li.dataset.id);
    li.classList.add('removing');
    renderStats();
    setTimeout(renderList, 300);
  }

  function edit(li) {
    const t = state.tasks.find((x) => x.id === li.dataset.id);
    const span = li.querySelector('.title');
    const input = document.createElement('input');
    input.className = 'edit'; input.value = t.title; input.maxLength = 80;
    span.replaceWith(input); input.focus(); input.select();
    let finished = false;
    const finish = (ok) => {
      if (finished) return; finished = true;
      const v = input.value.trim();
      if (ok && v) { t.title = v; save(); }
      renderList();
    };
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
  }

  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg; el.toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1800);
  }

  // ---------- theme ----------
  function setTheme(mode) {
    document.documentElement.dataset.theme = mode;
    el.theme.textContent = mode === 'dark' ? '☀️' : '🌙';
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
  }
  const savedTheme = (() => { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } })();
  setTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  // ---------- events ----------
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = el.input.value.trim();
    if (!v) { el.input.focus(); return; }
    addTask(v); el.input.value = '';
  });
  el.list.addEventListener('click', (e) => {
    const li = e.target.closest('.item'); if (!li) return;
    if (e.target.closest('.check')) toggle(li);
    else if (e.target.closest('.del')) remove(li);
  });
  el.list.addEventListener('dblclick', (e) => {
    const li = e.target.closest('.item');
    if (li && e.target.closest('.title')) edit(li);
  });
  el.tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab'); if (!btn) return;
    tab = btn.dataset.tab;
    el.tabs.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    moveTab(btn); renderList();
  });
  el.theme.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  window.addEventListener('resize', () => moveTab(el.tabs.querySelector('.tab.active')));

  // new day while the page stays open
  setInterval(() => {
    if (todayKey() !== currentDay) { currentDay = todayKey(); renderHeader(); renderStats(); renderList(); }
  }, 30000);

  // ---------- init ----------
  renderHeader(); renderStats(); renderList();
  document.fonts && document.fonts.ready.then(() => moveTab(el.tabs.querySelector('.tab.active')));
  moveTab(el.tabs.querySelector('.tab.active'));
})();
