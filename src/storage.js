// Lưu trạng thái "đã ăn" theo ngày. Storage hỏng hoặc bị chặn thì vẫn chạy trong bộ nhớ.

const KEY = 'auh:v1';
const KEEP_DAYS = 14;

export function createStore(storage) {
  let state = { eaten: {} };
  let available = false;

  try {
    // Đọc localStorage có thể ném SecurityError khi trình duyệt chặn lưu trữ.
    if (storage === undefined) storage = globalThis.localStorage;
    if (storage) {
      const raw = storage.getItem(KEY);
      available = true;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.eaten === 'object' && parsed.eaten) state = { eaten: parsed.eaten };
        } catch {
          // dữ liệu hỏng: bắt đầu lại
        }
      }
    }
  } catch {
    available = false;
  }

  function save() {
    const keys = Object.keys(state.eaten).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete state.eaten[k];
    if (!available) return;
    try {
      storage.setItem(KEY, JSON.stringify(state));
    } catch {
      available = false;
    }
  }

  return {
    get available() {
      return available;
    },
    getEaten(day) {
      return new Set(state.eaten[day] ?? []);
    },
    toggle(day, entry) {
      const set = new Set(state.eaten[day] ?? []);
      const on = !set.has(entry);
      if (on) set.add(entry);
      else set.delete(entry);
      state.eaten[day] = [...set];
      save();
      return on;
    },
  };
}
