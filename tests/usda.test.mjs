import { test } from 'node:test';
import assert from 'node:assert/strict';
import { per100gFromFdc } from '../scripts/fetch-usda.mjs';

// Dạng trả về của GET /fdc/v1/food/{id} (SR Legacy, rút gọn)
const sample = {
  fdcId: 171477,
  description: 'Chicken, broilers or fryers, breast, meat only, cooked, roasted',
  dataType: 'SR Legacy',
  foodNutrients: [
    { nutrient: { number: '208', name: 'Energy', unitName: 'kcal' }, amount: 165 },
    { nutrient: { number: '203', name: 'Protein', unitName: 'g' }, amount: 31.02 },
    { nutrient: { number: '205', name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 0 },
    { nutrient: { number: '204', name: 'Total lipid (fat)', unitName: 'g' }, amount: 3.57 },
    { nutrient: { number: '268', name: 'Energy', unitName: 'kJ' }, amount: 690 },
  ],
};

test('đọc kcal, protein, carb, béo theo mã chất dinh dưỡng USDA', () => {
  assert.deepEqual(per100gFromFdc(sample), { kcal: 165, protein: 31.02, carb: 0, fat: 3.57 });
});

test('thiếu carb thì coi là 0, thiếu năng lượng thì báo lỗi', () => {
  const noCarb = { ...sample, foodNutrients: sample.foodNutrients.filter((n) => n.nutrient.number !== '205') };
  assert.equal(per100gFromFdc(noCarb).carb, 0);
  const noKcal = { ...sample, foodNutrients: sample.foodNutrients.filter((n) => n.nutrient.number !== '208') };
  assert.throws(() => per100gFromFdc(noKcal), /171477/);
});

test('Foundation dùng mã 957/958 cho năng lượng Atwater khi không có 208', () => {
  const foundation = { ...sample, foodNutrients: [
    { nutrient: { number: '958', name: 'Energy (Atwater Specific Factors)', unitName: 'kcal' }, amount: 120 },
    { nutrient: { number: '203', unitName: 'g' }, amount: 20 },
    { nutrient: { number: '204', unitName: 'g' }, amount: 4 },
  ] };
  assert.equal(per100gFromFdc(foundation).kcal, 120);
});

import { portionGrams } from '../scripts/fetch-usda.mjs';

const withPortions = {
  fdcId: 171287,
  foodPortions: [
    { amount: 1, modifier: 'large', gramWeight: 50 },
    { amount: 1, modifier: 'medium', gramWeight: 44 },
    { amount: 1, modifier: 'cup (4.86 large eggs)', gramWeight: 243 },
  ],
};
const foundationStyle = {
  fdcId: 2346406,
  foodPortions: [{ amount: 1, measureUnit: { name: 'tablespoon' }, portionDescription: '', gramWeight: 13.6 }],
};

test('portionGrams lấy gram của khẩu phần USDA theo từ khóa', () => {
  assert.equal(portionGrams(withPortions, 'large'), 50);
  assert.equal(portionGrams(withPortions, 'medium'), 44);
});
test('portionGrams đọc cả measureUnit (dữ liệu Foundation) và chia theo amount', () => {
  assert.equal(portionGrams(foundationStyle, 'tablespoon'), 13.6);
  assert.equal(portionGrams({ fdcId: 1, foodPortions: [{ amount: 2, modifier: 'tbsp', gramWeight: 30 }] }, 'tbsp'), 15);
});
test('portionGrams báo lỗi khi không có khẩu phần khớp', () => {
  assert.throws(() => portionGrams(withPortions, 'slice'), /171287.*slice/);
});

test('portionGrams quy đổi theo tỉ lệ: "cup/16" = 1 muỗng canh, "tsp*3" = 1 muỗng canh', () => {
  const cornstarch = { fdcId: 169698, foodPortions: [{ amount: 1, modifier: 'cup', gramWeight: 128 }] };
  assert.equal(portionGrams(cornstarch, 'cup/16'), 8);
  const sriracha = { fdcId: 171186, foodPortions: [{ amount: 1, modifier: 'tsp', gramWeight: 6.5 }] };
  assert.equal(portionGrams(sriracha, 'tsp*3'), 19.5);
});

test('portionGrams ưu tiên khẩu phần trùng đúng từ khóa, không lấy "cup (4.86 large eggs)"', () => {
  const egg = { fdcId: 171287, foodPortions: [
    { amount: 1, modifier: 'cup (4.86 large eggs)', gramWeight: 243 },
    { amount: 1, modifier: 'medium', gramWeight: 44 },
    { amount: 1, modifier: 'large', gramWeight: 50 },
  ] };
  assert.equal(portionGrams(egg, 'large'), 50);
  const tomato = { fdcId: 170457, foodPortions: [
    { amount: 1, modifier: 'slice, medium (1/4" thick)', gramWeight: 20 },
    { amount: 1, modifier: 'medium whole (2-3/5" dia)', gramWeight: 123 },
  ] };
  assert.equal(portionGrams(tomato, 'medium whole'), 123);
  const onion = { fdcId: 170000, foodPortions: [
    { amount: 1, modifier: 'slice, medium (1/8" thick)', gramWeight: 14 },
    { amount: 1, modifier: 'medium (2-1/2" dia)', gramWeight: 110 },
  ] };
  assert.equal(portionGrams(onion, 'medium'), 110);
});
