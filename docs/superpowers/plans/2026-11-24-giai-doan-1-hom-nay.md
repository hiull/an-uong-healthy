# Giai đoạn 1 — Màn "Hôm nay" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app cài được lên điện thoại: mỗi sáng mở ra thấy thực đơn hôm nay (theo thứ trong tuần), tick từng món đã ăn, thấy thanh tiến độ calo và protein.

**Architecture:** HTML/CSS/JS thuần dạng ES module, không bước build. Dữ liệu tĩnh trong `data/*.json`: bảng nguyên liệu (macro/100g), món ăn (nguyên liệu × gram), thực đơn tuần xếp tay. Logic thuần (tính macro, chọn thực đơn theo ngày, trạng thái tick) tách khỏi phần hiển thị để test bằng `node --test`. Trạng thái tick lưu `localStorage`. Service worker cho chạy offline.

**Tech Stack:** HTML, CSS, JavaScript ES modules; Node 22 `node:test` cho unit test; Playwright (có sẵn) cho smoke test; host GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-24-an-uong-healthy-design.md`

## Global Constraints

- Không framework, không bước build, không dependency npm lúc chạy.
- Giao diện tiếng Việt, thiết kế cho màn hình điện thoại (rộng 360–430px), không cuộn ngang.
- Mọi số macro hiển thị kèm chữ "ước lượng" ở chân trang hoặc cạnh tổng.
- Món lưu theo nguyên liệu × gram; macro luôn được tính, không gõ tay (trừ món có `macros` trực tiếp, dùng cho món mua ngoài).
- Kho khởi đầu khoảng 30 món Việt dễ nấu, nặng protein; mỗi ngày đủ bữa sáng, trưa, tối, phụ.
- Mọi đọc/ghi `localStorage` bọc `try/catch`; app phải hiện đúng khi storage không dùng được.
- Khoá lưu trữ: `auh:v1`.

## Review Focus

1. **Storage không dùng được** (Safari riêng tư, bị chặn): app vẫn hiện thực đơn, tick chỉ không được lưu. → test ở Task 2.
2. **Qua nửa đêm khi app đang mở**: khi quay lại app (sự kiện `visibilitychange`), phải hiện ngày mới và tick của ngày mới. → smoke test ở Task 4.
3. **Món tham chiếu nguyên liệu không tồn tại / thực đơn tham chiếu món không tồn tại**: script kiểm tra dữ liệu báo lỗi, không để lỗi lộ ra lúc chạy. → Task 3.
4. **Chủ nhật**: `Date.getDay()` trả 0; thực đơn tuần đánh số 0 = Chủ nhật, phải hiện "Chủ nhật" chứ không phải "Thứ 1". → test ở Task 2.
5. **Tick rồi tải lại trang**: trạng thái phải còn; tick của hôm qua không lẫn vào hôm nay. → test ở Task 2.

---

### Task 1: Tính macro

**Files:**
- Create: `src/nutrition.js`
- Test: `tests/nutrition.test.mjs`
- Create: `package.json` (chỉ `{"type":"module","scripts":{"test":"node --test tests/"}}`)

**Interfaces:**
- Produces:
  - `type Macros = {kcal:number, protein:number, carb:number, fat:number}`
  - `type Ingredient = {id:string, name:string, per100g:Macros}`
  - `type Dish = {id:string, name:string, slots:string[], tags:string[], items?:{ing:string, g:number}[], macros?:Macros, steps?:string}`
  - `dishMacros(dish: Dish, ingById: Map<string,Ingredient>, scale=1): Macros` — dùng `dish.macros` nếu có, ngược lại cộng `per100g * g/100`; nhân `scale`; ném `Error` nếu thiếu nguyên liệu.
  - `sumMacros(list: Macros[]): Macros`
  - `roundMacros(m: Macros): Macros` — kcal làm tròn số nguyên, còn lại 1 chữ số thập phân.

- [ ] **Step 1: Viết test thất bại**

```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { dishMacros, sumMacros, roundMacros } from '../src/nutrition.js';
const ing = new Map([['uc-ga',{id:'uc-ga',name:'Ức gà',per100g:{kcal:120,protein:23,carb:0,fat:2.6}}],
                     ['gao-lut',{id:'gao-lut',name:'Cơm gạo lứt',per100g:{kcal:112,protein:2.3,carb:23.5,fat:0.8}}]]);
const dish = {id:'com-ga',name:'Cơm gà',slots:['trua'],tags:[],items:[{ing:'uc-ga',g:150},{ing:'gao-lut',g:200}]};
test('cộng macro theo gram', () => assert.deepEqual(roundMacros(dishMacros(dish, ing)), {kcal:404,protein:39.1,carb:47,fat:5.5}));
test('nhân khẩu phần', () => assert.equal(Math.round(dishMacros(dish, ing, 0.5).kcal), 202));
test('món có macros trực tiếp', () => assert.deepEqual(dishMacros({id:'x',name:'Phở',slots:[],tags:[],macros:{kcal:450,protein:25,carb:55,fat:12}}, ing), {kcal:450,protein:25,carb:55,fat:12}));
test('thiếu nguyên liệu thì báo lỗi', () => assert.throws(() => dishMacros({...dish, items:[{ing:'khong-co',g:10}]}, ing), /khong-co/));
test('cộng danh sách, rỗng = 0', () => assert.deepEqual(sumMacros([]), {kcal:0,protein:0,carb:0,fat:0}));
```

- [ ] **Step 2: Chạy `npm test`** — Expected: FAIL (không tìm thấy module).
- [ ] **Step 3: Viết `src/nutrition.js` theo Interfaces.**
- [ ] **Step 4: Chạy `npm test`** — Expected: 5 PASS.
- [ ] **Step 5: Commit** `feat: tính macro món ăn từ nguyên liệu`

---

### Task 2: Thực đơn theo ngày và trạng thái tick

**Files:**
- Create: `src/plan.js`, `src/storage.js`
- Test: `tests/plan.test.mjs`, `tests/storage.test.mjs`

**Interfaces:**
- Consumes: `dishMacros`, `sumMacros` (Task 1).
- Produces:
  - `type WeekPlan = {days: {[weekday:'0'..'6']: {slot:string, dishes:{id:string, scale?:number}[]}[]}}` — `'0'` = Chủ nhật.
  - `SLOT_LABELS = {sang:'Bữa sáng', phu1:'Bữa phụ sáng', trua:'Bữa trưa', phu2:'Bữa phụ chiều', toi:'Bữa tối'}`
  - `weekdayLabel(date: Date): string` — `'Chủ nhật'`, `'Thứ 2'` … `'Thứ 7'`.
  - `dateKey(date: Date): string` — `'YYYY-MM-DD'` theo giờ máy.
  - `dayMeals(plan: WeekPlan, date: Date): {slot, label, dishes:{id, scale}[]}[]` — `scale` mặc định 1.
  - `entryKey(slot: string, index: number, dishId: string): string` — `` `${slot}:${index}:${dishId}` ``.
  - `dayTotals(meals, dishById: Map, ingById: Map, eaten: Set<string>): {planned: Macros, eaten: Macros}`
  - `createStore(storage = globalThis.localStorage)` trả `{getEaten(dateKey): Set<string>, toggle(dateKey, entryKey): boolean, available: boolean}`. Lưu JSON `{eaten: {[dateKey]: string[]}}` dưới khoá `auh:v1`; chỉ giữ 14 ngày gần nhất. Storage lỗi/không có → `available:false`, vẫn giữ trạng thái trong bộ nhớ.

- [ ] **Step 1: Viết test thất bại**

```js
// plan.test.mjs
test('Chủ nhật là 0', () => assert.equal(weekdayLabel(new Date(2026,10,29)), 'Chủ nhật'));
test('Thứ 2', () => assert.equal(weekdayLabel(new Date(2026,10,23)), 'Thứ 2'));
test('dateKey', () => assert.equal(dateKey(new Date(2026,0,5)), '2026-01-05'));
test('dayMeals lấy đúng thứ, scale mặc định 1', () => {
  const plan = {days:{'1':[{slot:'sang',dishes:[{id:'a'}]}]}};
  assert.deepEqual(dayMeals(plan, new Date(2026,10,23)), [{slot:'sang',label:'Bữa sáng',dishes:[{id:'a',scale:1}]}]);
});
test('dayTotals chỉ tính món đã tick vào eaten', () => { /* 2 món, tick 1 → eaten = macro món đó, planned = tổng 2 */ });
// storage.test.mjs — dùng fake storage {getItem,setItem}
test('toggle bật rồi tắt', ...);          // toggle trả true rồi false
test('giữ qua lần tạo store mới', ...);    // store2 = createStore(sameFake) thấy tick
test('ngày khác không lẫn', ...);          // getEaten('2026-11-25') rỗng
test('storage ném lỗi vẫn chạy', () => {   // getItem/setItem ném Error
  const s = createStore({getItem(){throw new Error()}, setItem(){throw new Error()}});
  assert.equal(s.available, false); assert.equal(s.toggle('d','k'), true); assert.ok(s.getEaten('d').has('k'));
});
test('chỉ giữ 14 ngày', ...);              // tick 16 ngày khác nhau → JSON lưu 14 khoá mới nhất
test('dữ liệu hỏng thì bắt đầu lại', ...); // getItem trả 'not json' → không ném lỗi
```

- [ ] **Step 2: Chạy `npm test`** — Expected: FAIL.
- [ ] **Step 3: Viết `src/plan.js` và `src/storage.js` theo Interfaces.**
- [ ] **Step 4: Chạy `npm test`** — Expected: tất cả PASS.
- [ ] **Step 5: Commit** `feat: thực đơn theo ngày và lưu trạng thái tick`

---

### Task 3: Dữ liệu khởi đầu và script kiểm tra

**Files:**
- Create: `data/ingredients.json` (`Ingredient[]`), `data/dishes.json` (`Dish[]`), `data/week-plan.json` (`WeekPlan`)
- Create: `scripts/validate-data.mjs`
- Test: `tests/data.test.mjs`

**Interfaces:**
- Consumes: kiểu `Ingredient`, `Dish`, `WeekPlan`; `dishMacros`, `dayMeals`.
- Produces: `validateData({ingredients, dishes, plan}): string[]` (export từ `scripts/validate-data.mjs`; danh sách lỗi, rỗng = hợp lệ). Chạy trực tiếp `node scripts/validate-data.mjs` in lỗi và thoát mã 1 nếu có lỗi.

Nội dung dữ liệu:
- Khoảng 40–60 nguyên liệu thường dùng (thịt gà, bò nạc, cá basa/hồi/ngừ, tôm, trứng, đậu hũ, sữa chua Hy Lạp, whey, gạo trắng/lứt, bún, bánh phở, yến mạch, khoai lang, bánh mì đen, chuối, rau xanh, dầu ăn, nước mắm…), macro/100g theo USDA FoodData Central và bảng thành phần thực phẩm Việt Nam, giá trị cho thực phẩm **đã nấu chín** khi món dùng dạng chín (ghi rõ trong `name`, ví dụ "Cơm gạo lứt (chín)").
- Khoảng 30 món, mỗi món có `slots` (`sang|phu1|trua|phu2|toi`), `tags` (`truoc-tap`, `sau-tap`, `nhanh`, `meal-prep`), `items` và `steps` 1–3 câu.
- `week-plan.json` cho 7 ngày, mỗi ngày 4–5 bữa, tổng khoảng 1700–1900 kcal và ≥ 100 g protein (mức tạm cho nữ tập gym ~55 kg; giai đoạn 2 sẽ cá nhân hoá).

Luật kiểm tra (`validateData`):
- `id` nguyên liệu và món là duy nhất, dạng `[a-z0-9-]+`.
- Mọi `items[].ing` tồn tại; `g > 0`; món có `items` hoặc `macros`.
- `slots` chỉ chứa giá trị trong `SLOT_LABELS`.
- `plan.days` có đủ `'0'`–`'6'`; mọi món tham chiếu tồn tại.

- [ ] **Step 1: Viết test thất bại** — `validateData` trả `[]` cho dữ liệu thật trong `data/`; trả lỗi chứa `'khong-co'` khi món dùng nguyên liệu `khong-co`; trả lỗi chứa `'6'` khi thiếu ngày `'6'`; trả lỗi khi trùng `id`; và một test in tổng kcal/protein mỗi ngày, khẳng định mỗi ngày nằm trong 1600–2000 kcal và protein ≥ 100.
- [ ] **Step 2: Chạy `npm test`** — Expected: FAIL.
- [ ] **Step 3: Viết `scripts/validate-data.mjs` và ba file dữ liệu.**
- [ ] **Step 4: Chạy `npm test` và `node scripts/validate-data.mjs`** — Expected: PASS, script in "Dữ liệu hợp lệ" và thoát mã 0.
- [ ] **Step 5: Commit** `feat: dữ liệu khởi đầu 30 món và script kiểm tra`

---

### Task 4: Giao diện "Hôm nay", cài được, chạy offline

**Files:**
- Create: `index.html`, `styles.css`, `src/app.js`, `manifest.webmanifest`, `sw.js`, `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`
- Test: `tests/smoke.mjs` (Playwright, chạy bằng `node tests/smoke.mjs`, không nằm trong `npm test`)
- Modify: `package.json` thêm script `"smoke": "node tests/smoke.mjs"`; `README.md` (cách mở, thêm vào màn hình chính, cách thêm món)

**Interfaces:**
- Consumes: mọi thứ từ Task 1–3; `fetch('data/…json')`.

Hành vi:
- Đầu trang: "Thứ 3, 24/11" và hai thanh tiến độ "Protein 62/110 g", "Calo 1100/1800 kcal" (đã ăn / kế hoạch).
- Mỗi bữa là một thẻ có tiêu đề (`SLOT_LABELS`), mỗi món một hàng: ô tick lớn (≥ 44px), tên món, "450 kcal · 35 g protein". Bấm vào tên mở rộng xem nguyên liệu (gram) và `steps`. Món đã tick bị gạch và mờ đi.
- Nút ‹ › để xem ngày hôm qua/mai (chỉ xem và tick, không đổi thực đơn).
- Chân trang: "Số liệu là ước lượng." Nếu `store.available === false`: thêm "Trình duyệt không cho lưu, tick sẽ mất khi tải lại."
- `visibilitychange` → nếu ngày đã đổi và đang xem "hôm nay" thì vẽ lại cho ngày mới.
- Màu theo token CSS, có chế độ tối theo `prefers-color-scheme`.
- `sw.js`: cache-first cho toàn bộ file tĩnh, phiên bản cache `auh-v1`; đăng ký chỉ khi chạy qua http(s).

- [ ] **Step 1: Viết smoke test thất bại** — mở `http://localhost:8080` (server `python3 -m http.server 8080` khởi động trong script) ở viewport 390×844 với đồng hồ giả `2026-11-23T08:00` (`page.clock.setFixedTime`), kiểm tra: tiêu đề chứa "Thứ 2"; có ≥ 4 thẻ bữa; tick món đầu tiên làm số protein "đã ăn" tăng; tải lại trang thì món vẫn được tick; chuyển đồng hồ sang `2026-11-24T00:05`, phát `visibilitychange` → tiêu đề "Thứ 3" và không còn món nào được tick; `document.documentElement.scrollWidth <= 390`; không có lỗi console.
- [ ] **Step 2: Chạy `npm run smoke`** — Expected: FAIL.
- [ ] **Step 3: Viết giao diện, manifest, service worker, icon, README.**
- [ ] **Step 4: Chạy `npm test && npm run smoke`** — Expected: tất cả PASS. Chụp màn hình 390×844 để người đặt xem.
- [ ] **Step 5: Commit** `feat: màn hình Hôm nay cài được trên điện thoại`

---

### Task 5: Đăng lên GitHub Pages

**Files:**
- Create: `.github/workflows/pages.yml` — chạy `npm test` và `node scripts/validate-data.mjs`, rồi deploy toàn bộ repo bằng `actions/upload-pages-artifact` + `actions/deploy-pages` khi push vào `main`.

- [ ] **Step 1: Viết workflow.**
- [ ] **Step 2: Kiểm tra cú pháp YAML** — `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/pages.yml'))"` không lỗi.
- [ ] **Step 3: Commit** `ci: tự deploy lên GitHub Pages`
- [ ] **Step 4: Ghi vào README** việc người đặt cần làm: merge vào `main`, bật Settings → Pages → Source: GitHub Actions; link sẽ là `https://<user>.github.io/an-uong-healthy/`.
