# Ăn uống healthy

Thực đơn mỗi ngày cho người tập gym. Mở trên điện thoại, xem các bữa hôm nay, tick món đã ăn và theo dõi protein, calo.

Không có món hay con số nào tự đặt ra:

- **Món ăn**: công thức thật từ [Món Ngon Mỗi Ngày](https://monngonmoingay.com/) (Ajinomoto), chủ yếu thuộc các chuyên mục *Hỗ trợ xây dựng khối cơ xương*, *Giảm khối mỡ thừa*, *Ăn kiêng*. Mỗi món trong app có link về trang gốc.
- **Dinh dưỡng**: tính từ [USDA FoodData Central](https://fdc.nal.usda.gov/) theo từng nguyên liệu (mỗi nguyên liệu có mã `fdcId`, bấm "USDA" trong app để xem). Củ, quả, muỗng được đổi ra gram theo khẩu phần USDA công bố (vd 1 quả trứng lớn = 50 g).
- Gia vị, rau nêm không ghi định lượng trong công thức gốc thì **không tính** và được liệt kê riêng, nên calo thực tế có thể cao hơn một chút. Khi trang gốc có ghi calo/người, app hiện cả số đó để đối chiếu.
- Vài nguyên liệu USDA không có (cá lóc, cá basa, nấm đùi gà…) dùng loại gần nhất và ghi rõ trong tên, xem `data/ingredients.json`.

## Cài lên điện thoại

1. Mở link app bằng Safari (iPhone) hoặc Chrome (Android).
2. iPhone: nút Chia sẻ → **Thêm vào MH chính**. Android: menu ⋮ → **Thêm vào màn hình chính** / **Cài đặt ứng dụng**.
3. Từ giờ mở bằng biểu tượng trên màn hình chính, kể cả khi không có mạng.

Trạng thái tick lưu trên chính điện thoại đó (giữ 14 ngày gần nhất).

## Dữ liệu và cách thêm món

| File | Nội dung |
|---|---|
| `data/sources/monngonmoingay.json` | Công thức gốc đã đọc từ trang (nguyên liệu, sơ chế, thực hiện, cách dùng, số người) |
| `data/sources/mapping.json` | Ghép tên nguyên liệu trong công thức với nguyên liệu chuẩn (`aliases`), bữa phù hợp của từng món (`recipes`), thực phẩm ăn kèm (`foods`) |
| `data/ingredients.json` | Nguyên liệu chuẩn, mã USDA `fdcId` và số liệu lấy về từ USDA |
| `data/dishes.json` | **Sinh tự động**, đừng sửa tay |
| `data/week-plan.json` | Thực đơn 7 ngày; `"0"` là Chủ nhật … `"6"` là Thứ 7; `"scale": 2` = ăn 2 phần |

Thêm món mới từ Món Ngon Mỗi Ngày:

```bash
# 1. Tải trang công thức về một thư mục, ví dụ pages/ten-mon.html, rồi đọc:
node scripts/import-monngon.mjs pages/ > /tmp/recipes.json
# 2. Chép công thức cần dùng vào data/sources/monngonmoingay.json,
#    thêm món vào "recipes" trong data/sources/mapping.json, ghép tên nguyên liệu mới vào "aliases"
#    (nguyên liệu mới thì thêm vào data/ingredients.json kèm fdcId tra trên fdc.nal.usda.gov)
# 3. Lấy số liệu USDA (cần API key api.data.gov, đặt ở biến USDA_API_KEY) và dựng lại món:
npm run data:usda
npm run data:dishes
node scripts/validate-data.mjs
```

## Phát triển

```bash
npm test                 # unit test (Node 22+)
npm run smoke            # test giao diện bằng Playwright
python3 -m http.server   # chạy thử tại http://localhost:8000
```

Không có bước build: HTML, CSS và JavaScript thuần.

Font: [Be Vietnam Pro](https://github.com/bettergui/BeVietnamPro), giấy phép SIL Open Font License (`fonts/LICENSE-OFL.txt`), đặt sẵn trong `fonts/` để chạy được khi không có mạng.

## Đăng lên mạng (GitHub Pages)

Làm một lần:

1. Merge nhánh này vào `main`.
2. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Mỗi lần push vào `main`, workflow `Deploy lên GitHub Pages` sẽ chạy test, kiểm tra dữ liệu rồi đăng lại.

Link app: `https://<tên-tài-khoản>.github.io/an-uong-healthy/`

Lưu ý: GitHub Pages của repo riêng tư cần gói GitHub trả phí; với tài khoản miễn phí, repo phải để công khai.
