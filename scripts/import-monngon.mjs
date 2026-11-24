// Đọc công thức từ trang monngonmoingay.com (Ajinomoto) đã tải về.
// Chạy: node scripts/import-monngon.mjs <thư mục chứa các file slug.html> > recipes.json
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function textLines(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>|<\/(p|li|div|h\d|tr|td|span|label)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decode(text).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

const NUM = String.raw`(\d+(?:[.,]\d+)?(?:\/\d+)?)`;
const UNITS = { g: 'g', gr: 'g', gram: 'g', kg: 'kg', ml: 'ml', l: 'l', lít: 'l' };

function toNumber(s) {
  if (s.includes('/')) {
    const [a, b] = s.split('/').map((x) => parseFloat(x.replace(',', '.')));
    return a / b;
  }
  return parseFloat(s.replace(',', '.'));
}

const cleanName = (s) => s.replace(/[\s:]+$/u, '').trim();
const round3 = (x) => Math.round(x * 1000) / 1000;

export function parseIngredientLine(text) {
  const clean = text.replace(/^[-–•]\s*/u, '').trim();
  if (/^(gia vị|rau nêm|ăn kèm)/iu.test(clean)) return { text, name: clean, qty: null, unit: null };

  // Dòng có khối lượng/thể tích (g, kg, ml…): lấy giá trị cuối cùng, vì ghi chú phía trước
  // thường là quy cách ("size 50 con/1kg"), còn phần trong ngoặc thường là quy đổi muỗng.
  const metric = [...clean.matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|gram|gr|g|ml|lít|l)(?![\p{L}])/giu)];
  if (metric.length) {
    const m = metric[metric.length - 1];
    let qty = toNumber(m[1]);
    let unit = UNITS[m[2].toLowerCase()];
    if (unit === 'kg') { qty *= 1000; unit = 'g'; }
    if (unit === 'l') { qty *= 1000; unit = 'ml'; }
    const paren = clean.indexOf('(');
    const end = paren >= 0 ? Math.min(paren, m.index) : m.index;
    return { text, name: cleanName(clean.slice(0, end)), qty: round3(qty), unit };
  }

  // Dòng đếm theo đơn vị (trái, củ, quả…) hoặc muỗng: M = muỗng canh, m = muỗng cà phê
  const m = clean.match(new RegExp(`^(.+?)[\\s:]+${NUM}\\s*([\\p{L}]+)?\\s*$`, 'u'));
  if (!m) return { text, name: clean, qty: null, unit: null };
  const rawUnit = m[3] ?? null;
  const unit = rawUnit === 'M' || rawUnit === 'm' ? rawUnit : rawUnit?.toLowerCase() ?? null;
  return { text, name: cleanName(m[1]), qty: round3(toNumber(m[2])), unit };
}

const section = (lines, start, ends) => {
  const i = lines.findIndex((l) => start.test(l));
  if (i < 0) return [];
  const out = [];
  for (const l of lines.slice(i + 1)) {
    if (ends.some((e) => e.test(l))) break;
    out.push(l);
  }
  return out;
};

export function parseRecipePage(html, slug) {
  const lines = textLines(html);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1 ? decode(h1[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim() : slug;

  const after = (label) => {
    const i = lines.findIndex((l) => label.test(l));
    return i >= 0 ? lines[i + 1] : null;
  };
  const servings = parseInt(after(/^Khẩu Phần:?$/i) ?? '', 10) || null;
  const minutes = parseInt(after(/^Thời gian thực hiện:?$/i) ?? '', 10) || null;
  const kcalLine = lines.find((l) => /^\d+\s*kcal\/người$/i.test(l));
  const kcalPerServing = kcalLine ? parseInt(kcalLine, 10) : null;

  const rawIngredients = section(lines, /^Nguyên Liệu:$/, [/^Sơ Chế:$/i, /^Thực Hiện:$/i]);
  const ingredientLines = [];
  for (const l of rawIngredients) {
    if (/^(Muỗng|Gram)$/i.test(l) || /^M: muỗng canh/i.test(l)) continue;
    if (ingredientLines.includes(l)) break; // trang lặp lại danh sách (bản muỗng / bản gram)
    ingredientLines.push(l);
  }

  const END = [/^Sơ Chế:$/i, /^Thực Hiện:$/i, /^Cách Dùng:$/i, /^Mách Nhỏ:$/i, /^Thực đơn /i, /^Khẩu Phần:?$/i, /^Tags$/];
  return {
    slug,
    url: `https://monngonmoingay.com/${slug}/`,
    title,
    servings,
    minutes,
    kcalPerServing,
    ingredients: ingredientLines.map(parseIngredientLine),
    prep: section(lines, /^Sơ Chế:$/i, END),
    steps: section(lines, /^Thực Hiện:$/i, END),
    serve: section(lines, /^Cách Dùng:$/i, END),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  const recipes = readdirSync(dir).filter((f) => f.endsWith('.html')).sort()
    .map((f) => parseRecipePage(readFileSync(join(dir, f), 'utf8'), basename(f, '.html')));
  process.stdout.write(JSON.stringify(recipes, null, 1));
}
