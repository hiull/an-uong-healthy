// Kiểm tra dữ liệu trong data/. Chạy: node scripts/validate-data.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SLOT_LABELS } from '../src/plan.js';

const ID = /^[a-z0-9-]+$/;

export function validateData({ ingredients, dishes, plan }) {
  const errors = [];

  const checkIds = (list, kind) => {
    const seen = new Set();
    for (const x of list) {
      if (!ID.test(x.id ?? '')) errors.push(`${kind} có id không hợp lệ: "${x.id}"`);
      if (seen.has(x.id)) errors.push(`${kind} trùng id: ${x.id}`);
      seen.add(x.id);
    }
    return seen;
  };

  const ingIds = checkIds(ingredients, 'Nguyên liệu');
  for (const i of ingredients) {
    for (const k of ['kcal', 'protein', 'carb', 'fat']) {
      if (typeof i.per100g?.[k] !== 'number' || i.per100g[k] < 0) errors.push(`Nguyên liệu ${i.id}: thiếu hoặc sai per100g.${k}`);
    }
  }

  const dishIds = checkIds(dishes, 'Món');
  for (const d of dishes) {
    if (!d.name) errors.push(`Món ${d.id}: thiếu tên`);
    if (!d.items?.length && !d.macros) errors.push(`Món ${d.id}: cần items hoặc macros`);
    for (const it of d.items ?? []) {
      if (!ingIds.has(it.ing)) errors.push(`Món ${d.id}: nguyên liệu không tồn tại: ${it.ing}`);
      if (!(it.g > 0)) errors.push(`Món ${d.id}: số gram phải > 0 (${it.ing})`);
    }
    if (!d.slots?.length) errors.push(`Món ${d.id}: thiếu slots`);
    for (const s of d.slots ?? []) if (!(s in SLOT_LABELS)) errors.push(`Món ${d.id}: slot không hợp lệ: ${s}`);
  }

  for (let wd = 0; wd < 7; wd++) {
    const meals = plan.days?.[String(wd)];
    if (!meals) {
      errors.push(`Thực đơn thiếu ngày ${wd}`);
      continue;
    }
    for (const meal of meals) {
      if (!(meal.slot in SLOT_LABELS)) errors.push(`Ngày ${wd}: slot không hợp lệ: ${meal.slot}`);
      for (const { id } of meal.dishes) if (!dishIds.has(id)) errors.push(`Ngày ${wd}: món không tồn tại: ${id}`);
    }
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const load = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
  const errors = validateData({ ingredients: load('ingredients.json'), dishes: load('dishes.json'), plan: load('week-plan.json') });
  if (errors.length) {
    for (const e of errors) console.error('✗ ' + e);
    process.exit(1);
  }
  console.log('Dữ liệu hợp lệ');
}
