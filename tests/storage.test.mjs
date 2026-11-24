import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/storage.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

test('toggle bật rồi tắt', () => {
  const s = createStore(fakeStorage());
  assert.equal(s.available, true);
  assert.equal(s.toggle('2026-11-24', 'sang:0:a'), true);
  assert.ok(s.getEaten('2026-11-24').has('sang:0:a'));
  assert.equal(s.toggle('2026-11-24', 'sang:0:a'), false);
  assert.equal(s.getEaten('2026-11-24').size, 0);
});
test('giữ qua lần tạo store mới (tải lại trang)', () => {
  const fake = fakeStorage();
  createStore(fake).toggle('2026-11-24', 'sang:0:a');
  assert.ok(createStore(fake).getEaten('2026-11-24').has('sang:0:a'));
  assert.ok(fake.data['auh:v1']);
});
test('ngày khác không lẫn', () => {
  const s = createStore(fakeStorage());
  s.toggle('2026-11-24', 'sang:0:a');
  assert.equal(s.getEaten('2026-11-25').size, 0);
});
test('storage ném lỗi vẫn chạy', () => {
  const s = createStore({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
  assert.equal(s.available, false);
  assert.equal(s.toggle('d', 'k'), true);
  assert.ok(s.getEaten('d').has('k'));
});
test('không có storage vẫn chạy', () => {
  const s = createStore(undefined);
  assert.equal(s.available, false);
  assert.equal(s.toggle('d', 'k'), true);
});
test('chỉ giữ 14 ngày gần nhất', () => {
  const fake = fakeStorage();
  const s = createStore(fake);
  for (let d = 1; d <= 16; d++) s.toggle(`2026-11-${String(d).padStart(2, '0')}`, 'k');
  const saved = Object.keys(JSON.parse(fake.data['auh:v1']).eaten).sort();
  assert.equal(saved.length, 14);
  assert.equal(saved[0], '2026-11-03');
  assert.equal(saved[13], '2026-11-16');
});
test('dữ liệu hỏng thì bắt đầu lại', () => {
  const s = createStore(fakeStorage({ 'auh:v1': 'not json' }));
  assert.equal(s.getEaten('d').size, 0);
  assert.equal(s.toggle('d', 'k'), true);
});

test('đọc localStorage ném SecurityError vẫn chạy', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    const s = createStore();
    assert.equal(s.available, false);
    assert.equal(s.toggle('d', 'k'), true);
  } finally {
    delete globalThis.localStorage;
  }
});
