// Dựng data/dishes.json từ công thức gốc (data/sources/monngonmoingay.json) và số liệu USDA
// (data/ingredients.json). Không có con số nào được gõ tay: gram lấy từ công thức,
// macro lấy từ USDA, quy đổi củ/quả/muỗng theo khẩu phần USDA công bố.
// Chạy: npm run data:dishes
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SOURCE_NAME = 'Món Ngon Mỗi Ngày (Ajinomoto)';

/** Gram của một dòng nguyên liệu, hoặc null nếu không quy đổi được. */
function gramsOf(line, ingredient) {
  if (line.qty == null || !line.unit) return null;
  if (line.unit === 'g' || line.unit === 'ml') return line.qty; // ml ≈ g cho chất lỏng gốc nước
  const per = ingredient.unitGrams?.[line.unit];
  return per ? Math.round(line.qty * per * 100) / 100 : null;
}

export function buildDish(recipe, meta, aliases, ingById) {
  const items = [];
  const unmeasured = [];
  for (const line of recipe.ingredients) {
    const id = aliases[line.name.toLowerCase()];
    if (!id) { unmeasured.push(line.text); continue; }
    const ingredient = ingById.get(id);
    if (!ingredient) throw new Error(`${recipe.slug}: alias "${line.name}" trỏ tới nguyên liệu không có: ${id}`);
    const g = gramsOf(line, ingredient);
    if (g == null || g <= 0) unmeasured.push(line.text);
    else items.push({ ing: id, g, text: line.text });
  }
  return {
    id: recipe.slug,
    name: recipe.title,
    slots: meta.slots,
    tags: meta.tags ?? [],
    servings: recipe.servings,
    source: { name: SOURCE_NAME, url: recipe.url, kcalPerServing: recipe.kcalPerServing ?? null },
    items,
    unmeasured,
    prep: recipe.prep,
    steps: recipe.steps,
    serve: recipe.serve,
  };
}

/** Món chỉ gồm một thực phẩm (cơm, sữa chua, chuối…), số liệu lấy thẳng từ USDA. */
export function foodDish(food, ingById) {
  const ingredient = ingById.get(food.ing);
  if (!ingredient) throw new Error(`${food.id}: nguyên liệu không có: ${food.ing}`);
  const items = [{ ing: food.ing, g: food.g, text: food.text ?? `${ingredient.name} ${food.g} g` }];
  for (const extra of food.extra ?? []) {
    const ex = ingById.get(extra.ing);
    if (!ex) throw new Error(`${food.id}: nguyên liệu không có: ${extra.ing}`);
    items.push({ ing: extra.ing, g: extra.g, text: extra.text ?? `${ex.name} ${extra.g} g` });
  }
  return {
    id: food.id,
    name: food.name,
    slots: food.slots,
    tags: [...(food.tags ?? []), 'thuc-pham'],
    servings: 1,
    source: { name: 'USDA FoodData Central', url: `https://fdc.nal.usda.gov/food-details/${ingredient.fdcId}/nutrients`, kcalPerServing: null },
    items,
    unmeasured: [],
    prep: [],
    steps: food.steps ? [food.steps] : [],
    serve: [],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
  const ingredients = read('ingredients.json');
  const ingById = new Map(ingredients.map((i) => [i.id, i]));
  const recipes = read('sources/monngonmoingay.json');
  const { aliases, recipes: meta, foods } = read('sources/mapping.json');
  const bySlug = new Map(recipes.map((r) => [r.slug, r]));
  const dishes = [];
  for (const [slug, m] of Object.entries(meta)) {
    const recipe = bySlug.get(slug);
    if (!recipe) throw new Error(`Không có công thức gốc cho ${slug}`);
    dishes.push(buildDish(recipe, m, aliases, ingById));
  }
  for (const f of foods) dishes.push(foodDish(f, ingById));
  writeFileSync(new URL('../data/dishes.json', import.meta.url), JSON.stringify(dishes, null, 1) + '\n');
  console.log(`Đã dựng ${dishes.length} món vào data/dishes.json`);
}
