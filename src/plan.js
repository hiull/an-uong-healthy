// Thực đơn theo ngày: chọn bữa theo thứ trong tuần và tính tổng macro.
import { dishMacros, sumMacros } from './nutrition.js';

export const SLOT_LABELS = {
  sang: 'Bữa sáng',
  phu1: 'Bữa phụ sáng',
  trua: 'Bữa trưa',
  phu2: 'Bữa phụ chiều',
  toi: 'Bữa tối',
};

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function weekdayLabel(date) {
  return WEEKDAYS[date.getDay()];
}

export function dateKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayMeals(plan, date) {
  const meals = plan.days?.[String(date.getDay())] ?? [];
  return meals.map(({ slot, dishes }) => ({
    slot,
    label: SLOT_LABELS[slot] ?? slot,
    dishes: dishes.map(({ id, scale }) => ({ id, scale: scale ?? 1 })),
  }));
}

export function entryKey(slot, index, dishId) {
  return `${slot}:${index}:${dishId}`;
}

export function dayTotals(meals, dishById, ingById, eaten) {
  const planned = [];
  const done = [];
  for (const meal of meals) {
    meal.dishes.forEach(({ id, scale }, i) => {
      const dish = dishById.get(id);
      if (!dish) return;
      const m = dishMacros(dish, ingById, scale);
      planned.push(m);
      if (eaten.has(entryKey(meal.slot, i, id))) done.push(m);
    });
  }
  return { planned: sumMacros(planned), eaten: sumMacros(done) };
}
