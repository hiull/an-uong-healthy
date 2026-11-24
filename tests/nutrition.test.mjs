import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dishMacros, sumMacros, roundMacros } from '../src/nutrition.js';

const ing = new Map([
  ['uc-ga', { id: 'uc-ga', name: 'Ức gà', per100g: { kcal: 120, protein: 23, carb: 0, fat: 2.6 } }],
  ['gao-lut', { id: 'gao-lut', name: 'Cơm gạo lứt', per100g: { kcal: 112, protein: 2.3, carb: 23.5, fat: 0.8 } }],
]);
const dish = { id: 'com-ga', name: 'Cơm gà', slots: ['trua'], tags: [], items: [{ ing: 'uc-ga', g: 150 }, { ing: 'gao-lut', g: 200 }] };

test('cộng macro theo gram', () => {
  assert.deepEqual(roundMacros(dishMacros(dish, ing)), { kcal: 404, protein: 39.1, carb: 47, fat: 5.5 });
});
test('nhân khẩu phần', () => {
  assert.equal(Math.round(dishMacros(dish, ing, 0.5).kcal), 202);
});
test('món có macros trực tiếp', () => {
  const pho = { id: 'x', name: 'Phở', slots: [], tags: [], macros: { kcal: 450, protein: 25, carb: 55, fat: 12 } };
  assert.deepEqual(dishMacros(pho, ing), { kcal: 450, protein: 25, carb: 55, fat: 12 });
});
test('thiếu nguyên liệu thì báo lỗi', () => {
  assert.throws(() => dishMacros({ ...dish, items: [{ ing: 'khong-co', g: 10 }] }, ing), /khong-co/);
});
test('cộng danh sách, rỗng = 0', () => {
  assert.deepEqual(sumMacros([]), { kcal: 0, protein: 0, carb: 0, fat: 0 });
  assert.deepEqual(sumMacros([{ kcal: 1, protein: 2, carb: 3, fat: 4 }, { kcal: 1, protein: 1, carb: 1, fat: 1 }]), { kcal: 2, protein: 3, carb: 4, fat: 5 });
});

test('safeDishMacros trả null khi thiếu nguyên liệu', async () => {
  const { safeDishMacros } = await import('../src/nutrition.js');
  assert.equal(safeDishMacros({ ...dish, items: [{ ing: 'khong-co', g: 10 }] }, ing), null);
  assert.equal(Math.round(safeDishMacros(dish, ing).kcal), 404);
});
