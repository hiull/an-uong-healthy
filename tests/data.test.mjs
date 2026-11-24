import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateData } from '../scripts/validate-data.mjs';
import { dayMeals, dayTotals } from '../src/plan.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const real = () => ({ ingredients: load('ingredients.json'), dishes: load('dishes.json'), plan: load('week-plan.json') });

test('dữ liệu thật hợp lệ', () => assert.deepEqual(validateData(real()), []));

test('báo món dùng nguyên liệu không tồn tại', () => {
  const d = real();
  d.dishes[0] = { ...d.dishes[0], items: [{ ing: 'khong-co', g: 10 }], macros: undefined };
  assert.ok(validateData(d).some((e) => e.includes('khong-co')));
});

test('báo thiếu ngày', () => {
  const d = real();
  delete d.plan.days['6'];
  assert.ok(validateData(d).some((e) => e.includes('6')));
});

test('báo trùng id', () => {
  const d = real();
  d.dishes.push({ ...d.dishes[0] });
  assert.ok(validateData(d).some((e) => e.includes(d.dishes[0].id)));
});

test('báo thực đơn dùng món không tồn tại', () => {
  const d = real();
  d.plan.days['0'][0].dishes.push({ id: 'mon-ma' });
  assert.ok(validateData(d).some((e) => e.includes('mon-ma')));
});

test('báo slot lạ', () => {
  const d = real();
  d.dishes[0] = { ...d.dishes[0], slots: ['dem-khuya'] };
  assert.ok(validateData(d).some((e) => e.includes('dem-khuya')));
});

test('mỗi ngày 1600–2000 kcal và protein ≥ 100 g', () => {
  const { ingredients, dishes, plan } = real();
  const ingById = new Map(ingredients.map((i) => [i.id, i]));
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  for (let wd = 0; wd < 7; wd++) {
    const date = new Date(2026, 10, 22 + wd); // 22/11/2026 là Chủ nhật
    const { planned } = dayTotals(dayMeals(plan, date), dishById, ingById, new Set());
    console.log(`ngày ${wd}: ${Math.round(planned.kcal)} kcal, ${Math.round(planned.protein)} g protein`);
    assert.ok(planned.kcal >= 1600 && planned.kcal <= 2000, `ngày ${wd}: ${planned.kcal} kcal`);
    assert.ok(planned.protein >= 100, `ngày ${wd}: ${planned.protein} g protein`);
  }
});

test('báo món không có nguồn (link công thức hoặc USDA)', () => {
  const d = real();
  d.dishes[0] = { ...d.dishes[0], source: undefined };
  assert.ok(validateData(d).some((e) => e.includes(d.dishes[0].id) && e.includes('nguồn')));
});

test('báo nguyên liệu không có mã USDA hoặc chưa có số liệu', () => {
  const d = real();
  d.ingredients[0] = { ...d.ingredients[0], fdcId: undefined };
  assert.ok(validateData(d).some((e) => e.includes(d.ingredients[0].id) && e.includes('fdcId')));
});

test('mọi món trong dữ liệu thật đều có link nguồn https', () => {
  for (const dish of real().dishes) assert.match(dish.source.url, /^https:\/\//, dish.id);
});
