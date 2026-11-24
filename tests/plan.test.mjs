import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekdayLabel, dateKey, dayMeals, entryKey, dayTotals, SLOT_LABELS } from '../src/plan.js';

test('Chủ nhật là 0', () => assert.equal(weekdayLabel(new Date(2026, 10, 29)), 'Chủ nhật'));
test('Thứ 2 và Thứ 7', () => {
  assert.equal(weekdayLabel(new Date(2026, 10, 23)), 'Thứ 2');
  assert.equal(weekdayLabel(new Date(2026, 10, 28)), 'Thứ 7');
});
test('dateKey theo giờ máy, có số 0 đầu', () => assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05'));
test('SLOT_LABELS', () => assert.equal(SLOT_LABELS.trua, 'Bữa trưa'));
test('dayMeals lấy đúng thứ, scale mặc định 1', () => {
  const plan = { days: { 1: [{ slot: 'sang', dishes: [{ id: 'a' }, { id: 'b', scale: 1.5 }] }] } };
  assert.deepEqual(dayMeals(plan, new Date(2026, 10, 23)), [
    { slot: 'sang', label: 'Bữa sáng', dishes: [{ id: 'a', scale: 1 }, { id: 'b', scale: 1.5 }] },
  ]);
});
test('dayMeals ngày không có trong plan trả rỗng', () => {
  assert.deepEqual(dayMeals({ days: {} }, new Date(2026, 10, 23)), []);
});
test('entryKey', () => assert.equal(entryKey('trua', 1, 'com-ga'), 'trua:1:com-ga'));
test('dayTotals chỉ tính món đã tick vào eaten', () => {
  const ingById = new Map([['x', { id: 'x', name: 'X', per100g: { kcal: 100, protein: 10, carb: 0, fat: 0 } }]]);
  const dishById = new Map([
    ['a', { id: 'a', name: 'A', slots: [], tags: [], items: [{ ing: 'x', g: 100 }] }],
    ['b', { id: 'b', name: 'B', slots: [], tags: [], items: [{ ing: 'x', g: 200 }] }],
  ]);
  const meals = [{ slot: 'sang', label: 'Bữa sáng', dishes: [{ id: 'a', scale: 1 }, { id: 'b', scale: 1 }] }];
  const t = dayTotals(meals, dishById, ingById, new Set(['sang:1:b']));
  assert.equal(t.planned.kcal, 300);
  assert.equal(t.eaten.kcal, 200);
  assert.equal(t.eaten.protein, 20);
});
