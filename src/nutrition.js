// Tính macro (calo, protein, carb, béo) cho món ăn từ bảng nguyên liệu.

const KEYS = ['kcal', 'protein', 'carb', 'fat'];

const zero = () => ({ kcal: 0, protein: 0, carb: 0, fat: 0 });

/** Macro của một món, nhân với khẩu phần `scale`. */
export function dishMacros(dish, ingById, scale = 1) {
  const total = zero();
  if (dish.macros) {
    for (const k of KEYS) total[k] = (dish.macros[k] ?? 0) * scale;
    return total;
  }
  for (const { ing, g } of dish.items ?? []) {
    const ingredient = ingById.get(ing);
    if (!ingredient) throw new Error(`Món "${dish.id}" dùng nguyên liệu không tồn tại: ${ing}`);
    for (const k of KEYS) total[k] += (ingredient.per100g[k] ?? 0) * (g / 100) * scale;
  }
  return total;
}

/** Như dishMacros nhưng trả null thay vì ném lỗi, dùng cho giao diện. */
export function safeDishMacros(dish, ingById, scale = 1) {
  try {
    return dishMacros(dish, ingById, scale);
  } catch {
    return null;
  }
}

export function sumMacros(list) {
  const total = zero();
  for (const m of list) for (const k of KEYS) total[k] += m[k];
  return total;
}

export function roundMacros(m) {
  const r1 = (x) => Math.round(x * 10) / 10;
  return { kcal: Math.round(m.kcal), protein: r1(m.protein), carb: r1(m.carb), fat: r1(m.fat) };
}
