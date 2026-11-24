# Ăn uống healthy cho bạn gái tập gym — thiết kế (bản ngắn)

## Mục đích
Một app riêng cho bạn gái của người đặt (tập gym). Mỗi sáng cô ấy mở điện thoại, thấy thực đơn hôm nay và tick từng món đã ăn. Không cần cầu kỳ.

## Mục tiêu
- Màn hình "Hôm nay": các bữa (sáng, trưa, tối, phụ, trước/sau tập), mỗi món có calo và protein; tick để đánh dấu đã ăn; thanh tiến độ calo và protein trong ngày.
- Thực đơn tuần tự xếp từ kho món theo mục tiêu calo/protein của cô ấy (xếp hàng loạt).
- Chỉnh tay: bấm "đổi" để thay món bằng món có macro gần giống; thêm một món từ kho vào bất kỳ bữa nào; tự tạo món riêng (tên, calo, protein).
- Kho món mở rộng được tới 1000+ món chỉ bằng cách thêm dữ liệu, không sửa code.
- Cài lên màn hình chính điện thoại như app, dùng được khi không có mạng.

## Không làm (non-goals)
Tài khoản, server, đồng bộ nhiều máy, xem tiến độ từ xa, nhận diện ảnh món ăn, nhắc giờ ăn, biểu đồ cân nặng.

## Điều phải tránh (anti-goals)
- Làm phức tạp hơn một tờ thực đơn tiện dụng.
- Số liệu macro sai nhưng trông như chính xác: mọi số liệu ghi rõ là ước lượng.

## Ràng buộc
- Chạy hoàn toàn trên điện thoại, host tĩnh miễn phí (repo đã có trên GitHub, có thể dùng GitHub Pages).
- Giao diện tiếng Việt, ưu tiên màn hình điện thoại.
- Trạng thái (tick, thực đơn tuần, món tự tạo, hồ sơ) lưu trên máy cô ấy.

## Các hướng đã cân nhắc
- **A. Web nhẹ cài như app, dữ liệu tĩnh, lưu trên máy (đã chọn).** Đơn giản nhất, phù hợp "không cầu kỳ". Đánh đổi: đổi máy thì mất lịch sử tick; muốn thêm món phải đăng lại app.
- B. Như A nhưng thực đơn đọc từ Google Sheet. Sửa tiện hơn nhưng thêm phụ thuộc, thừa cho một người dùng.
- C. Có server (Supabase). Đồng bộ và xem từ xa được nhưng phải làm đăng nhập; trái với yêu cầu đơn giản.

## Quyết định của người đặt
- Chọn hướng A.
- Thực đơn tuần xếp tự động từ kho món, kèm tuỳ chọn tự thêm món.
- Muốn kho có thể lên tới 1000 món.

## Các lựa chọn của mình (cần xác nhận)
- Công nghệ: HTML/CSS/JavaScript thuần, không bước build, kèm service worker và manifest để cài và chạy offline.
- Kho món là một file `dishes.json`. Mỗi món gồm: tên, bữa phù hợp, calo, protein, carb, béo, nguyên liệu, cách nấu ngắn, thẻ (trước tập, sau tập, nhanh...).
- Có script chuyển CSV (soạn trong Excel/Sheets) thành `dishes.json` để thêm hàng loạt.
- Bắt đầu với khoảng 60–100 món Việt dễ nấu, nặng protein, do mình soạn; macro tính từ nguyên liệu theo USDA và bảng thành phần Việt Nam, gắn nhãn "ước lượng" để bạn xem lại. Mở rộng dần.
- Hồ sơ nhập trong app (cân nặng, mục tiêu tăng cơ/giảm mỡ/giữ dáng, món không ăn). App gợi ý calo và protein mỗi ngày (protein khoảng 1,6–2,2 g/kg), cô ấy sửa tay được.
- Xếp thực đơn: với mỗi bữa chọn món phù hợp sao cho tổng ngày sát mục tiêu (lệch khoảng 5%), không lặp món trong tuần, bỏ qua món cô ấy không ăn.
- Có nút xuất/nhập dữ liệu ra file để sao lưu khi đổi máy.

## Để người xây quyết định
Bố cục và màu sắc cụ thể, công thức tính calo chi tiết, cách lưu và định dạng nhãn ước lượng.

## Cập nhật sau khi chốt cách tiếp cận (đã được người đặt đồng ý)
- Làm theo giai đoạn: (1) màn "Hôm nay" + tick + thanh tiến độ + khoảng 30 món, thực đơn xếp tay; (2) hồ sơ, tự xếp thực đơn tuần, đổi món, nút "ăn ngoài / món khác", sao lưu xuất/nhập; (3) bảng nguyên liệu, script CSV, mở rộng kho; (4) danh sách đi chợ, ngày tập và ngày nghỉ.
- Món lưu theo nguyên liệu × gram, macro tự tính từ bảng khoảng 200 nguyên liệu (macro mỗi 100g, từ USDA và bảng thành phần Việt Nam). Món mua ngoài hoặc đóng gói cho nhập thẳng calo và protein.
- Xếp thực đơn bằng thuật toán đơn giản: mỗi bữa chiếm tỷ lệ calo cố định, chọn món ngẫu nhiên đúng thẻ, co giãn khẩu phần cho khớp mục tiêu. Khoảng 150 món cộng khẩu phần co giãn là đủ đa dạng; 1000 món là khả năng mở rộng, không phải điều kiện bắt buộc.
- Cô ấy tự chỉnh được món và hồ sơ trong app, để dùng được dù đây là quà bất ngờ hay cô ấy góp ý từ đầu (mình chọn thế vì chưa rõ cô ấy có biết hay không).
