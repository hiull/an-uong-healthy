// Smoke test giao diện: node tests/smoke.mjs  (cần Playwright có sẵn trên máy)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = 8080;
const URL_ = `http://localhost:${PORT}/`;

const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
const failures = [];
const check = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) failures.push(msg); };

try {
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.clock.setFixedTime(new Date('2026-11-23T08:00:00'));
  await page.goto(URL_);
  await page.waitForSelector('.meal');

  check((await page.textContent('#day-title')).includes('Thứ 2'), 'tiêu đề là Thứ 2');
  check((await page.locator('.meal').count()) >= 4, 'có ít nhất 4 bữa');

  const protein = async () => Number((await page.textContent('#protein-eaten')).replace(',', '.'));
  const before = await protein();
  await page.locator('.dish input[type=checkbox]').first().check();
  check((await protein()) > before, 'tick làm protein đã ăn tăng');

  await page.screenshot({ path: process.env.SHOT ?? '/dev/null' }).catch(() => {});

  await page.reload();
  await page.waitForSelector('.meal');
  check(await page.locator('.dish input[type=checkbox]').first().isChecked(), 'tải lại vẫn còn tick');

  await page.clock.setFixedTime(new Date('2026-11-24T00:05:00'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction(() => document.querySelector('#day-title').textContent.includes('Thứ 3'), null, { timeout: 3000 }).catch(() => {});
  check((await page.textContent('#day-title')).includes('Thứ 3'), 'qua nửa đêm chuyển sang Thứ 3');
  check((await page.locator('.dish input[type=checkbox]:checked').count()) === 0, 'ngày mới không có món nào được tick');

  // Dải tuần: 7 ngày, chạm một ngày để chuyển sang ngày đó
  check((await page.locator('.week-day').count()) === 7, 'dải tuần có 7 ngày');
  await page.locator('.week-day[data-date="2026-11-25"]').click();
  check((await page.textContent('#day-title')).includes('Thứ 4'), 'chạm ngày trong dải tuần chuyển sang Thứ 4');
  check(await page.isVisible('#go-today'), 'hiện nút Về hôm nay khi xem ngày khác');
  await page.click('#go-today');
  check((await page.textContent('#day-title')).includes('Thứ 3'), 'Về hôm nay quay lại Thứ 3');

  // Bảng chi tiết món
  await page.locator('.dish-open').first().click();
  check(await page.isVisible('#dish-sheet'), 'chạm món mở bảng chi tiết');
  check((await page.locator('#dish-sheet .ingredients li').count()) > 0, 'bảng chi tiết có danh sách nguyên liệu');
  await page.click('#sheet-eat');
  check(await page.locator('.dish input[type=checkbox]').first().isChecked(), 'nút trong bảng chi tiết đánh dấu đã ăn');
  check(!(await page.isVisible('#dish-sheet')), 'bảng chi tiết đóng sau khi đánh dấu');

  check(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 16px "Be Vietnam Pro"'); }), 'font Be Vietnam Pro đã tải');

  check((await page.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'không cuộn ngang');
  check(errors.length === 0, `không có lỗi console ${errors.join(' | ')}`);
  await browser.close();
} finally {
  server.kill();
}

if (failures.length) { console.error(`${failures.length} kiểm tra thất bại`); process.exit(1); }
console.log('Smoke test OK');
