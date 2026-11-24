import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRecipePage, parseIngredientLine } from '../scripts/import-monngon.mjs';

const html = readFileSync(new URL('./fixtures/monngon-sample.html', import.meta.url), 'utf8');

test('đọc tên, khẩu phần, kcal/người và thời gian', () => {
  const r = parseRecipePage(html, 'uc-ga-mau');
  assert.equal(r.title, 'Ức gà áp chảo mẫu');
  assert.equal(r.url, 'https://monngonmoingay.com/uc-ga-mau/');
  assert.equal(r.servings, 2);
  assert.equal(r.kcalPerServing, 250);
  assert.equal(r.minutes, 20);
});

test('đọc danh sách nguyên liệu một lần, không lặp', () => {
  const r = parseRecipePage(html, 'uc-ga-mau');
  assert.deepEqual(r.ingredients.map((i) => i.text), ['Ức gà 300g', 'Bông cải xanh 150g', 'Thơm 1/4 trái', 'Sữa tươi 200ml', 'Gia vị: Dầu ăn, tiêu']);
});

test('đọc sơ chế, thực hiện, cách dùng', () => {
  const r = parseRecipePage(html, 'uc-ga-mau');
  assert.deepEqual(r.prep, ['Ức gà lạng mỏng, ướp tiêu.', 'Bông cải cắt nhỏ.']);
  assert.deepEqual(r.steps, ['Áp chảo gà với 1m dầu cho chín vàng.']);
  assert.deepEqual(r.serve, ['Dùng nóng với bông cải.']);
});

test('tách tên, số lượng và đơn vị của dòng nguyên liệu', () => {
  assert.deepEqual(parseIngredientLine('Ức gà 300g'), { text: 'Ức gà 300g', name: 'Ức gà', qty: 300, unit: 'g' });
  assert.deepEqual(parseIngredientLine('Sữa tươi 200ml'), { text: 'Sữa tươi 200ml', name: 'Sữa tươi', qty: 200, unit: 'ml' });
  assert.deepEqual(parseIngredientLine('Thơm 1/4 trái'), { text: 'Thơm 1/4 trái', name: 'Thơm', qty: 0.25, unit: 'trái' });
  assert.deepEqual(parseIngredientLine('Thịt bò 0,5kg'), { text: 'Thịt bò 0,5kg', name: 'Thịt bò', qty: 500, unit: 'g' });
  assert.deepEqual(parseIngredientLine('Gia vị: Dầu ăn, tiêu'), { text: 'Gia vị: Dầu ăn, tiêu', name: 'Gia vị: Dầu ăn, tiêu', qty: null, unit: null });
});

test('ưu tiên số gram trong dòng có ghi chú hoặc đơn vị phụ', () => {
  const p = (t) => { const r = parseIngredientLine(t); return [r.name, r.qty, r.unit]; };
  assert.deepEqual(p('Hành tây: 25g (1/4 củ)'), ['Hành tây', 25, 'g']);
  assert.deepEqual(p('Đường 42g (3.5M)'), ['Đường', 42, 'g']);
  assert.deepEqual(p('Tôm sú size 50 con/1kg 200g'), ['Tôm sú size 50 con/1kg', 200, 'g']);
  assert.deepEqual(p('Thịt thăn bê 300g Từng miếng dày 0,5cm dài 5cm'), ['Thịt thăn bê', 300, 'g']);
  assert.deepEqual(p('Bò Sirlion Úc (200g/miếng) 1 miếng'), ['Bò Sirlion Úc', 200, 'g']);
  assert.deepEqual(p('Nước dừa tươi 200ml (2 chén nước dừa tươi nguyên chất)'), ['Nước dừa tươi', 200, 'ml']);
});

test('bỏ gạch đầu dòng và dấu hai chấm trong tên', () => {
  const r = parseIngredientLine('- Tôm đất tươi: 300g');
  assert.equal(r.name, 'Tôm đất tươi');
  assert.equal(parseIngredientLine('Má đùi gà : 150g').name, 'Má đùi gà');
  assert.deepEqual([parseIngredientLine('Mè rang: 2M').qty, parseIngredientLine('Mè rang: 2M').unit], [2, 'M']);
  assert.equal(parseIngredientLine('Tỏi băm: 1m').unit, 'm');
});
