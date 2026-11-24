# Ăn uống healthy

Thực đơn mỗi ngày cho người tập gym. Mở trên điện thoại, xem các bữa hôm nay, tick món đã ăn và theo dõi protein, calo.

Số liệu calo và protein là **ước lượng**, tính từ nguyên liệu theo USDA FoodData Central và bảng thành phần thực phẩm Việt Nam.

## Cài lên điện thoại

1. Mở link app bằng Safari (iPhone) hoặc Chrome (Android).
2. iPhone: nút Chia sẻ → **Thêm vào MH chính**. Android: menu ⋮ → **Thêm vào màn hình chính** / **Cài đặt ứng dụng**.
3. Từ giờ mở bằng biểu tượng trên màn hình chính, kể cả khi không có mạng.

Trạng thái tick lưu trên chính điện thoại đó (giữ 14 ngày gần nhất).

## Sửa thực đơn và thêm món

Mọi dữ liệu nằm trong thư mục `data/`:

| File | Nội dung |
|---|---|
| `ingredients.json` | Nguyên liệu và macro trên 100 g (`kcal`, `protein`, `carb`, `fat`) |
| `dishes.json` | Món ăn: danh sách nguyên liệu × gram, bữa phù hợp (`slots`), thẻ (`tags`), cách nấu (`steps`) |
| `week-plan.json` | Thực đơn 7 ngày; `"0"` là Chủ nhật, `"1"` là Thứ 2 … `"6"` là Thứ 7 |

Ví dụ một món:

```json
{
  "id": "com-lut-uc-ga",
  "name": "Cơm gạo lứt ức gà áp chảo",
  "slots": ["trua", "toi"],
  "tags": ["meal-prep", "sau-tap"],
  "items": [{ "ing": "com-gao-lut", "g": 150 }, { "ing": "uc-ga", "g": 130 }],
  "steps": "Ướp ức gà, áp chảo mỗi mặt 5–6 phút."
}
```

- `slots`: `sang`, `phu1` (phụ sáng), `trua`, `phu2` (phụ chiều), `toi`.
- `tags`: `truoc-tap`, `sau-tap`, `nhanh`, `meal-prep`, `an-ngoai`.
- Món mua ngoài: thay `items` bằng `"macros": { "kcal": 450, "protein": 28, "carb": 55, "fat": 12 }`.
- Trong `week-plan.json` có thể đổi khẩu phần: `{ "id": "com-lut-uc-ga", "scale": 1.2 }`.

Sau khi sửa, kiểm tra dữ liệu:

```bash
node scripts/validate-data.mjs
```

## Phát triển

```bash
npm test                 # unit test (Node 22+)
npm run smoke            # test giao diện bằng Playwright
python3 -m http.server   # chạy thử tại http://localhost:8000
```

Không có bước build: HTML, CSS và JavaScript thuần.
