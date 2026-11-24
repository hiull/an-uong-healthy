// Màn hình "Hôm nay": hiển thị thực đơn theo ngày, tick món đã ăn.
import { safeDishMacros, roundMacros } from './nutrition.js';
import { dayMeals, dayTotals, dateKey, entryKey, weekdayLabel } from './plan.js';
import { createStore } from './storage.js';

const TAG_LABELS = { 'truoc-tap': 'Trước tập', 'sau-tap': 'Sau tập', nhanh: 'Nhanh', 'meal-prep': 'Nấu sẵn', 'an-ngoai': 'Ăn ngoài' };

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) if (c != null) node.append(c);
  return node;
};

const store = createStore();
const expanded = new Set();
let data;
let viewDate = new Date();
let viewingToday = true;

async function loadData() {
  const get = async (f) => {
    const res = await fetch(`data/${f}`);
    if (!res.ok) throw new Error(`Không tải được ${f}`);
    return res.json();
  };
  const [ingredients, dishes, plan] = await Promise.all([get('ingredients.json'), get('dishes.json'), get('week-plan.json')]);
  return {
    plan,
    ingById: new Map(ingredients.map((i) => [i.id, i])),
    dishById: new Map(dishes.map((d) => [d.id, d])),
  };
}

function relativeLabel(date) {
  const diff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
  return { 0: 'Hôm nay', [-1]: 'Hôm qua', 1: 'Ngày mai' }[diff] ?? null;
}
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function renderHeader() {
  const dd = String(viewDate.getDate()).padStart(2, '0');
  const mm = String(viewDate.getMonth() + 1).padStart(2, '0');
  const rel = relativeLabel(viewDate);
  $('#day-title').textContent = `${weekdayLabel(viewDate)}, ${dd}/${mm}`;
  $('#day-title').title = rel ?? '';
  $('#go-today').hidden = viewingToday;
}

function renderTotals(meals, eaten) {
  const { planned, eaten: done } = dayTotals(meals, data.dishById, data.ingById, eaten);
  const pct = (a, b) => `${b > 0 ? Math.min(100, (a / b) * 100) : 0}%`;
  $('#protein-eaten').textContent = Math.round(done.protein);
  $('#protein-planned').textContent = Math.round(planned.protein);
  $('#kcal-eaten').textContent = Math.round(done.kcal);
  $('#kcal-planned').textContent = Math.round(planned.kcal);
  $('#protein-bar').style.width = pct(done.protein, planned.protein);
  $('#kcal-bar').style.width = pct(done.kcal, planned.kcal);
}

function dishRow(meal, index, { id, scale }, day, eaten) {
  const dish = data.dishById.get(id);
  if (!dish) return null;
  const key = entryKey(meal.slot, index, id);
  const raw = safeDishMacros(dish, data.ingById, scale);
  const m = raw ? roundMacros(raw) : null;
  const isDone = eaten.has(key);
  const isOpen = expanded.has(key);

  const box = el('input', { type: 'checkbox', checked: isDone });
  box.setAttribute('aria-label', `Đã ăn: ${dish.name}`);
  box.addEventListener('change', () => {
    store.toggle(day, key);
    render();
  });

  const nameBtn = el('button', { className: 'dish-name', type: 'button' },
    el('span', { className: 'name', textContent: dish.name }),
    el('span', { className: 'meta', textContent: m ? `${m.kcal} kcal · ${Math.round(m.protein)} g protein` : 'Chưa có số liệu' }));
  nameBtn.setAttribute('aria-expanded', String(isOpen));
  nameBtn.addEventListener('click', () => {
    if (expanded.has(key)) expanded.delete(key);
    else expanded.add(key);
    render();
  });

  const row = el('li', { className: `dish${isDone ? ' done' : ''}` }, el('label', { className: 'tick' }, box), nameBtn);
  if (isOpen) {
    const tags = (dish.tags ?? []).filter((t) => TAG_LABELS[t]).map((t) => el('span', { className: 'tag', textContent: TAG_LABELS[t] }));
    const items = dish.items?.length
      ? el('ul', {}, ...dish.items.map(({ ing, g }) => el('li', { textContent: `${data.ingById.get(ing)?.name ?? ing}: ${Math.round(g * scale)} g` })))
      : null;
    row.append(el('div', { className: 'detail' }, el('div', {}, ...tags), items,
      m ? el('p', { textContent: `Carb ${Math.round(m.carb)} g · Béo ${Math.round(m.fat)} g` }) : null,
      dish.steps ? el('p', { textContent: dish.steps }) : null));
  }
  return row;
}

function render() {
  const day = dateKey(viewDate);
  const meals = dayMeals(data.plan, viewDate);
  const eaten = store.getEaten(day);
  renderHeader();
  renderTotals(meals, eaten);
  const cards = meals.map((meal) => el('section', { className: 'meal' },
    el('h2', { textContent: meal.label }),
    el('ul', {}, ...meal.dishes.map((d, i) => dishRow(meal, i, d, day, eaten)).filter(Boolean))));
  $('#meals').replaceChildren(...cards);
  $('#storage-warning').hidden = store.available;
}

function shiftDay(delta) {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + delta);
  viewingToday = dateKey(viewDate) === dateKey(new Date());
  expanded.clear();
  render();
}

function goToday() {
  viewDate = new Date();
  viewingToday = true;
  expanded.clear();
  render();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !data) return;
  if (viewingToday && dateKey(viewDate) !== dateKey(new Date())) goToday();
});
$('#prev-day').addEventListener('click', () => shiftDay(-1));
$('#next-day').addEventListener('click', () => shiftDay(1));
$('#go-today').addEventListener('click', goToday);

try {
  data = await loadData();
  render();
} catch (err) {
  $('#meals').replaceChildren(el('p', { className: 'error', textContent: `Không tải được thực đơn. Kiểm tra mạng rồi mở lại. (${err.message})` }));
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
