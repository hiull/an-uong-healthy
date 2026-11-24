// Màn hình "Hôm nay": thực đơn theo ngày, tick món đã ăn, bảng chi tiết món.
import { safeDishMacros, roundMacros } from './nutrition.js';
import { dayMeals, dayTotals, dateKey, entryKey, weekdayLabel } from './plan.js';
import { createStore } from './storage.js';

// Thẻ "xay-dung-co", "giam-mo", "an-kieng", "can-bang" là chuyên mục do chính trang công thức gốc phân loại.
const TAG_LABELS = {
  'xay-dung-co': 'Hỗ trợ xây dựng cơ',
  'giam-mo': 'Giảm mỡ thừa',
  'an-kieng': 'Ăn kiêng',
  'can-bang': 'Cân bằng dinh dưỡng',
  'truoc-tap': 'Trước tập',
  'sau-tap': 'Sau tập',
  'an-kem': 'Ăn kèm',
};
const fdcUrl = (fdcId) => `https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients`;
const fmtScale = (s) => String(s).replace('.', ',');
const SHORT_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const RING_LENGTH = 2 * Math.PI * 52;

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) if (c != null && c !== false) node.append(c);
  return node;
};

const store = createStore();
let data;
let viewDate = new Date();
let viewingToday = true;
let sheetEntry = null; // { day, key, dish, scale }

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

async function loadData() {
  const get = async (f) => {
    const res = await fetch(`data/${f}`);
    if (!res.ok) throw new Error(`không tải được ${f}`);
    return res.json();
  };
  const [ingredients, dishes, plan] = await Promise.all([get('ingredients.json'), get('dishes.json'), get('week-plan.json')]);
  return { plan, ingById: new Map(ingredients.map((i) => [i.id, i])), dishById: new Map(dishes.map((d) => [d.id, d])) };
}

function relativeLabel(date) {
  const diff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
  return { 0: 'Hôm nay', [-1]: 'Hôm qua', 1: 'Ngày mai' }[diff] ?? '';
}

function renderHeader() {
  $('#day-rel').textContent = relativeLabel(viewDate);
  $('#day-title').textContent = `${weekdayLabel(viewDate)}, ${viewDate.getDate()} tháng ${viewDate.getMonth() + 1}`;
  $('#go-today').hidden = viewingToday;
}

function renderWeek() {
  const monday = addDays(viewDate, -((viewDate.getDay() + 6) % 7));
  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(viewDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((d) => {
    const key = dateKey(d);
    const classes = ['week-day'];
    if (key === todayKey) classes.push('is-today');
    if (key === selectedKey) classes.push('is-selected');
    if (store.getEaten(key).size) classes.push('has-ticks');
    const btn = el('button', { type: 'button', className: classes.join(' ') },
      el('span', { className: 'wd', textContent: SHORT_WEEKDAYS[d.getDay()] }),
      el('span', { className: 'dn', textContent: d.getDate() }),
      el('span', { className: 'dot' }));
    btn.dataset.date = key;
    btn.setAttribute('aria-label', `${weekdayLabel(d)}, ${d.getDate()} tháng ${d.getMonth() + 1}`);
    if (key === selectedKey) btn.setAttribute('aria-current', 'date');
    btn.addEventListener('click', () => setDay(d));
    return btn;
  });
  $('#week-days').replaceChildren(...days);
}

function renderSummary(meals, eaten) {
  const { planned, eaten: done } = dayTotals(meals, data.dishById, data.ingById, eaten);
  const ratio = (a, b) => (b > 0 ? Math.min(1, a / b) : 0);
  $('#protein-eaten').textContent = Math.round(done.protein);
  $('#protein-planned').textContent = Math.round(planned.protein);
  $('#protein-ring').style.strokeDashoffset = String(RING_LENGTH * (1 - ratio(done.protein, planned.protein)));
  const left = Math.round(planned.protein - done.protein);
  const leftEl = $('#protein-left');
  leftEl.textContent = planned.protein === 0 ? 'Chưa có thực đơn cho ngày này' : left > 0 ? `Còn ${left} g protein` : 'Đủ protein rồi!';
  leftEl.classList.toggle('done', planned.protein > 0 && left <= 0);
  $('#kcal-eaten').textContent = Math.round(done.kcal);
  $('#kcal-planned').textContent = Math.round(planned.kcal);
  $('#kcal-bar').style.width = `${ratio(done.kcal, planned.kcal) * 100}%`;
  const total = meals.reduce((n, m) => n + m.dishes.length, 0);
  $('#dishes-total').textContent = total;
  $('#dishes-done').textContent = meals.reduce((n, m) => n + m.dishes.filter((d, i) => eaten.has(entryKey(m.slot, i, d.id))).length, 0);
}

function dishRow(meal, index, { id, scale }, day, eaten) {
  const dish = data.dishById.get(id);
  if (!dish) return null;
  const key = entryKey(meal.slot, index, id);
  const raw = safeDishMacros(dish, data.ingById, scale);
  const m = raw ? roundMacros(raw) : null;
  const isDone = eaten.has(key);
  const tag = (dish.tags ?? []).map((t) => TAG_LABELS[t]).find(Boolean);

  const box = el('input', { type: 'checkbox', checked: isDone });
  box.dataset.key = key;
  box.setAttribute('aria-label', `Đã ăn: ${dish.name}`);
  box.addEventListener('change', () => {
    store.toggle(day, key);
    render(key);
  });

  const open = el('button', { type: 'button', className: 'dish-open' },
    el('span', { className: 'dish-name', textContent: dish.name }),
    el('span', { className: 'dish-stats' },
      m ? el('span', { className: 'stat stat-protein', textContent: `${Math.round(m.protein)} g protein` }) : null,
      el('span', { className: 'stat stat-kcal', textContent: m ? `${m.kcal} kcal` : 'Chưa có số liệu' }),
      scale !== 1 ? el('span', { className: 'stat-tag', textContent: `${fmtScale(scale)} phần` }) : null,
      tag && scale === 1 ? el('span', { className: 'stat-tag', textContent: tag }) : null));
  open.addEventListener('click', () => openSheet({ day, key, dish, scale }));

  return el('li', { className: `dish${isDone ? ' done' : ''}` }, open, el('label', { className: 'tick' }, box));
}

function render(focusKey) {
  const day = dateKey(viewDate);
  const meals = dayMeals(data.plan, viewDate);
  const eaten = store.getEaten(day);
  renderHeader();
  renderWeek();
  renderSummary(meals, eaten);
  const sections = meals.map((meal) => {
    const kcal = meal.dishes.reduce((sum, { id, scale }) => {
      const dish = data.dishById.get(id);
      return sum + ((dish && safeDishMacros(dish, data.ingById, scale)?.kcal) || 0);
    }, 0);
    return el('section', { className: 'meal' },
      el('header', { className: 'meal-head' },
        el('h2', { textContent: meal.label }),
        el('span', { className: 'meal-kcal', textContent: `${Math.round(kcal)} kcal` })),
      el('ul', {}, ...meal.dishes.map((d, i) => dishRow(meal, i, d, day, eaten)).filter(Boolean)));
  });
  $('#meals').replaceChildren(...(sections.length ? sections : [el('p', { className: 'error', textContent: 'Ngày này chưa có thực đơn.' })]));
  $('#storage-warning').hidden = store.available;
  if (focusKey) document.querySelector(`.tick input[data-key="${CSS.escape(focusKey)}"]`)?.focus();
}

function openSheet(entry) {
  sheetEntry = entry;
  const { dish, scale, day, key } = entry;
  const raw = safeDishMacros(dish, data.ingById, scale);
  const m = raw ? roundMacros(raw) : null;
  const tags = (dish.tags ?? []).filter((t) => TAG_LABELS[t]).map((t) => el('span', { textContent: TAG_LABELS[t] }));

  let macros = null;
  if (m) {
    const kp = m.protein * 4, kc = m.carb * 4, kf = m.fat * 9, sum = kp + kc + kf || 1;
    const seg = (cls, v) => { const i = el('i', { className: cls }); i.style.flex = String(v / sum); return i; };
    macros = el('div', {},
      el('div', { className: 'macros' },
        el('div', { className: 'macro p' }, el('b', { textContent: `${Math.round(m.protein)} g` }), el('span', { textContent: 'Protein' })),
        el('div', { className: 'macro' }, el('b', { textContent: `${Math.round(m.carb)} g` }), el('span', { textContent: 'Carb' })),
        el('div', { className: 'macro' }, el('b', { textContent: `${Math.round(m.fat)} g` }), el('span', { textContent: 'Béo' })),
        el('div', { className: 'macro' }, el('b', { textContent: m.kcal }), el('span', { textContent: 'kcal' }))),
      el('div', { className: 'split', 'aria-hidden': 'true' }, seg('p', kp), seg('c', kc), seg('f', kf)));
  }

  const servings = dish.servings || 1;
  const isFood = dish.tags?.includes('thuc-pham');
  const portionNote = isFood
    ? (scale !== 1 ? `Số liệu cho ${fmtScale(scale)} phần.` : null)
    : `Số liệu cho ${fmtScale(scale)} phần ăn. Công thức gốc cho ${servings} người.`;
  const notes = [
    portionNote,
    dish.source?.kcalPerServing ? `Trang gốc ghi ${dish.source.kcalPerServing} kcal/người (đã gồm dầu và gia vị).` : null,
  ].filter(Boolean).map((t) => el('p', { className: 'sheet-note', textContent: t }));

  // Mỗi dòng nguyên liệu: nguyên văn công thức, kèm link tới số liệu USDA đã dùng để tính
  const ingredients = dish.items?.length
    ? [el('h3', { textContent: isFood ? 'Thành phần' : `Nguyên liệu (cho ${servings} người)` }),
      el('ul', { className: 'ingredients' }, ...dish.items.map(({ ing, text }) => {
        const ingredient = data.ingById.get(ing);
        const link = el('a', { href: fdcUrl(ingredient?.fdcId), target: '_blank', rel: 'noopener', textContent: 'USDA' });
        link.setAttribute('aria-label', `Số liệu USDA: ${ingredient?.fdcDescription ?? ing}`);
        return el('li', {}, el('span', { textContent: text }), link);
      }))]
    : [];
  const unmeasured = dish.unmeasured?.length
    ? [el('h3', { textContent: 'Gia vị, rau nêm (không tính vào số liệu)' }), el('p', { className: 'steps', textContent: dish.unmeasured.join(' · ') })]
    : [];
  const section = (title, lines) => (lines?.length ? [el('h3', { textContent: title }), ...lines.map((l) => el('p', { className: 'steps', textContent: l }))] : []);

  const sourceLink = el('a', { className: 'source-link', href: dish.source.url, target: '_blank', rel: 'noopener', textContent: dish.source.name });
  const source = el('p', { className: 'sheet-source' },
    isFood ? 'Số liệu: ' : 'Công thức: ', sourceLink,
    isFood ? null : '. Số liệu dinh dưỡng: USDA FoodData Central.');

  $('#sheet-title').textContent = dish.name;
  $('#sheet-body').replaceChildren(
    tags.length ? el('div', { className: 'sheet-tags' }, ...tags) : '',
    macros ?? el('p', { className: 'steps', textContent: 'Món này chưa có số liệu dinh dưỡng.' }),
    ...notes,
    ...ingredients,
    ...unmeasured,
    ...section('Sơ chế', dish.prep),
    ...section(isFood ? 'Gợi ý' : 'Thực hiện', dish.steps),
    ...section('Cách dùng', dish.serve),
    source);
  const done = store.getEaten(day).has(key);
  const eatBtn = $('#sheet-eat');
  eatBtn.textContent = done ? 'Bỏ đánh dấu đã ăn' : 'Đã ăn món này';
  eatBtn.classList.toggle('secondary', done);
  $('#dish-sheet').showModal();
}

function closeSheet() {
  $('#dish-sheet').close();
}

function setDay(d) {
  viewDate = startOfDay(d);
  viewingToday = dateKey(viewDate) === dateKey(new Date());
  render();
}

$('#sheet-close').addEventListener('click', closeSheet);
$('#sheet-eat').addEventListener('click', () => {
  if (!sheetEntry) return;
  store.toggle(sheetEntry.day, sheetEntry.key);
  closeSheet();
  render(sheetEntry.key);
});
$('#dish-sheet').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSheet(); });
$('#prev-week').addEventListener('click', () => setDay(addDays(viewDate, -7)));
$('#next-week').addEventListener('click', () => setDay(addDays(viewDate, 7)));
$('#go-today').addEventListener('click', () => setDay(new Date()));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !data) return;
  if (viewingToday && dateKey(viewDate) !== dateKey(new Date())) setDay(new Date());
});

try {
  data = await loadData();
  render();
} catch (err) {
  $('#meals').replaceChildren(el('p', { className: 'error', textContent: `Chưa tải được thực đơn (${err.message}). Kiểm tra kết nối mạng rồi mở lại app.` }));
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
