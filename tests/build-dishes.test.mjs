import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDish, foodDish } from '../scripts/build-dishes.mjs';

const ingById = new Map([
  ['uc-ga', { id: 'uc-ga', name: 'Ức gà', fdcId: 171077, per100g: { kcal: 120, protein: 22.5, carb: 0, fat: 2.62 } }],
  ['hanh-tay', { id: 'hanh-tay', name: 'Hành tây', fdcId: 170000, per100g: { kcal: 40, protein: 1.1, carb: 9.34, fat: 0.1 }, unitGrams: { 'củ': 110 } }],
  ['dau-an', { id: 'dau-an', name: 'Dầu ăn', fdcId: 171411, per100g: { kcal: 884, protein: 0, carb: 0, fat: 100 }, unitGrams: { M: 13.6, m: 4.5 } }],
]);
const aliases = { 'ức gà không da': 'uc-ga', 'hành tây': 'hanh-tay', 'dầu ăn': 'dau-an' };
const recipe = {
  slug: 'uc-ga-hap', url: 'https://monngonmoingay.com/uc-ga-hap/', title: 'Ức gà hấp', servings: 2, kcalPerServing: null,
  ingredients: [
    { text: 'Ức gà không da: 250g', name: 'Ức gà không da', qty: 250, unit: 'g' },
    { text: 'Hành tây 1/2 củ', name: 'Hành tây', qty: 0.5, unit: 'củ' },
    { text: 'Dầu ăn 1M', name: 'Dầu ăn', qty: 1, unit: 'M' },
    { text: 'Gừng mài: 1m', name: 'Gừng mài', qty: 1, unit: 'm' },
    { text: 'Gia vị: Muối, tiêu', name: 'Gia vị: Muối, tiêu', qty: null, unit: null },
  ],
  prep: ['Sơ chế.'], steps: ['Hấp 15 phút.'], serve: ['Ăn nóng.'],
};

test('buildDish quy đổi gram theo nguyên liệu và đơn vị USDA', () => {
  const d = buildDish(recipe, { slots: ['trua', 'toi'], tags: ['sau-tap'] }, aliases, ingById);
  assert.deepEqual(d.items, [
    { ing: 'uc-ga', g: 250, text: 'Ức gà không da: 250g' },
    { ing: 'hanh-tay', g: 55, text: 'Hành tây 1/2 củ' },
    { ing: 'dau-an', g: 13.6, text: 'Dầu ăn 1M' },
  ]);
  assert.deepEqual(d.unmeasured, ['Gừng mài: 1m', 'Gia vị: Muối, tiêu']);
  assert.equal(d.servings, 2);
  assert.deepEqual(d.source, { name: 'Món Ngon Mỗi Ngày (Ajinomoto)', url: 'https://monngonmoingay.com/uc-ga-hap/', kcalPerServing: null });
  assert.equal(d.id, 'uc-ga-hap');
  assert.equal(d.name, 'Ức gà hấp');
  assert.deepEqual(d.slots, ['trua', 'toi']);
  assert.deepEqual(d.steps, ['Hấp 15 phút.']);
});

test('buildDish bỏ vào "không tính" khi đơn vị không có trong USDA', () => {
  const r = { ...recipe, ingredients: [{ text: 'Hành tây 2 lát', name: 'Hành tây', qty: 2, unit: 'lát' }] };
  const d = buildDish(r, { slots: ['toi'], tags: [] }, aliases, ingById);
  assert.deepEqual(d.items, []);
  assert.deepEqual(d.unmeasured, ['Hành tây 2 lát']);
});

test('buildDish báo lỗi khi alias trỏ tới nguyên liệu không có', () => {
  assert.throws(() => buildDish(recipe, { slots: ['toi'], tags: [] }, { 'ức gà không da': 'khong-co' }, ingById), /khong-co/);
});

test('foodDish tạo món một thực phẩm, nguồn là trang USDA', () => {
  const d = foodDish({ id: 'uc-ga-luoc', name: 'Ức gà luộc', ing: 'uc-ga', g: 100, slots: ['phu1'], tags: [] }, ingById);
  assert.deepEqual(d.items, [{ ing: 'uc-ga', g: 100, text: 'Ức gà 100 g' }]);
  assert.equal(d.servings, 1);
  assert.equal(d.source.url, 'https://fdc.nal.usda.gov/food-details/171077/nutrients');
});
