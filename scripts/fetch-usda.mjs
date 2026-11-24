// Lấy số liệu dinh dưỡng thật từ USDA FoodData Central cho mọi nguyên liệu trong
// data/ingredients.json (theo fdcId), rồi ghi lại vào chính file đó:
//   - per100g: kcal, protein, carb, fat trên 100 g
//   - unitGrams: số gram của 1 đơn vị đếm (củ, quả, muỗng…) theo khẩu phần USDA công bố
// Chạy: npm run data:usda
// Cần API key của api.data.gov gửi qua header X-Api-Key (biến môi trường USDA_API_KEY;
// trong môi trường có proxy tự gắn key thì không cần).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENERGY_KCAL = ['208', '958', '957']; // 208 = Energy (kcal); 957/958 = Atwater (dữ liệu Foundation)

export function per100gFromFdc(food) {
  const byNumber = new Map();
  for (const n of food.foodNutrients ?? []) {
    const num = n.nutrient?.number ?? n.nutrientNumber;
    const unit = (n.nutrient?.unitName ?? n.unitName ?? '').toLowerCase();
    if (num && !(ENERGY_KCAL.includes(String(num)) && unit === 'kj')) byNumber.set(String(num), n.amount ?? n.value);
  }
  const kcal = ENERGY_KCAL.map((k) => byNumber.get(k)).find((v) => typeof v === 'number');
  if (typeof kcal !== 'number') throw new Error(`fdcId ${food.fdcId}: không có số liệu năng lượng (kcal)`);
  const g = (num) => (typeof byNumber.get(num) === 'number' ? byNumber.get(num) : 0);
  return { kcal, protein: g('203'), carb: g('205'), fat: g('204') };
}

/**
 * Số gram của 1 đơn vị khẩu phần USDA có mô tả chứa `keyword` (vd "large", "medium", "tbsp").
 * Có thể kèm tỉ lệ quy đổi chuẩn: "cup/16" (1 muỗng canh), "tsp*3" (1 muỗng canh), "fl oz/2".
 */
export function portionGrams(food, spec) {
  const ratio = spec.match(/^(.*?)\s*([/*])\s*(\d+(?:\.\d+)?)$/);
  if (ratio) {
    const base = portionGrams(food, ratio[1]);
    const n = Number(ratio[3]);
    return Math.round((ratio[2] === '/' ? base / n : base * n) * 100) / 100;
  }
  const keyword = spec;
  const kw = keyword.toLowerCase();
  const describe = (p) => [p.modifier, p.portionDescription, p.measureUnit?.name, p.measureUnit?.abbreviation]
    .filter(Boolean).join(' ').toLowerCase();
  // Ưu tiên: trùng hẳn > bắt đầu bằng từ khóa (vd "medium (2-1/2" dia)") > chứa từ khóa.
  // Tránh khớp nhầm "cup (4.86 large eggs)" hay "slice, medium" khi tìm "large"/"medium".
  const candidates = (food.foodPortions ?? []).filter((x) => x.gramWeight > 0);
  const p = candidates.find((x) => describe(x) === kw)
    ?? candidates.find((x) => describe(x).startsWith(kw))
    ?? candidates.find((x) => describe(x).includes(kw));
  if (!p) throw new Error(`fdcId ${food.fdcId}: không có khẩu phần "${keyword}"`);
  return Math.round((p.gramWeight / (p.amount || 1)) * 100) / 100;
}

async function fetchFood(fdcId) {
  const headers = process.env.USDA_API_KEY ? { 'X-Api-Key': process.env.USDA_API_KEY } : {};
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?format=full`, { headers });
  if (!res.ok) throw new Error(`fdcId ${fdcId}: HTTP ${res.status}`);
  return res.json();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = new URL('../data/ingredients.json', import.meta.url);
  const ingredients = JSON.parse(readFileSync(path, 'utf8'));
  for (const ing of ingredients) {
    const food = await fetchFood(ing.fdcId);
    ing.fdcDescription = food.description;
    ing.fdcDataType = food.dataType;
    ing.per100g = per100gFromFdc(food);
    if (ing.units) {
      ing.unitGrams = Object.fromEntries(Object.entries(ing.units).map(([u, kw]) => [u, portionGrams(food, kw)]));
    }
    console.log(`${ing.id}: ${food.description} → ${JSON.stringify(ing.per100g)}${ing.unitGrams ? ' ' + JSON.stringify(ing.unitGrams) : ''}`);
  }
  writeFileSync(path, JSON.stringify(ingredients, null, 1) + '\n');
  console.log(`Đã cập nhật ${ingredients.length} nguyên liệu trong data/ingredients.json`);
}
