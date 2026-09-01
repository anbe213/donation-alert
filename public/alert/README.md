# Hướng dẫn cấu hình hệ thống Alert (config.json)

File `config.json` nằm trong thư mục này dùng để tùy chỉnh cách thức hoạt động của hệ thống thông báo Donate (Alert). Bạn có thể chỉnh sửa các thông số sau:

- `showLog`: (true/false) Nếu bật là `true`, hệ thống sẽ lưu lại toàn bộ lịch sử các giao dịch donate gốc vào file `payloads.log` ở thư mục gốc của project (Dùng để kiểm tra khi bị lỗi đọc sai tên người gửi). Đồng thời hiển thị log trên màn hình console.
- `enable_ai_parsing`: (true/false) Bật/tắt tính năng dùng AI để trích xuất tên người gửi, nội dung chuyển khoản và khôi phục dấu tiếng Việt cực chuẩn. 
- `groq_api_key`: (Chuỗi ký tự) Mã khóa API của Groq để sử dụng tính năng AI Parsing. Bạn có thể lấy miễn phí tại console.groq.com.
- `enable_zalo_ai`: (true/false) Bật/tắt giọng đọc bằng Zalo AI (Hiện tại đang tạm tắt vì chúng ta đã chuyển sang dùng VieNeu TTS).
- `enable_vieneu_tts`: (true/false) Bật/tắt giọng đọc bằng VieNeu TTS nội bộ cực mượt.
- `vieneu_voice`: (Chuỗi ký tự) Chọn giọng đọc cho VieNeu TTS. Hiện tại đang được cài đặt là `"Ngọc Trân"`.
- `tts_vietnamese`: (Chuỗi ký tự) Mẫu câu hệ thống sẽ tự động đọc khi có người donate. Các biến đặc biệt bạn có thể sử dụng (bắt buộc nằm trong dấu ngoặc nhọn):
  - `{name}`: Sẽ tự động được thay bằng tên người gửi.
  - `{amount}`: Sẽ tự động được thay bằng số tiền gửi.
  - `{message}`: Sẽ tự động được thay bằng nội dung lời nhắn.
- `tts_english`: (Chuỗi ký tự) Mẫu câu đọc tiếng Anh dự phòng (Thường ít dùng tới nếu bạn stream cho người Việt).
- `rain_density`: (Số nguyên) Mật độ đồng tiền rơi xuống trên màn hình alert khi có người donate. Số càng to thì mưa tiền càng dày đặc.
- `rain_tiers`: (Object) Các mốc tiền kích hoạt số lượng mưa tiền khác nhau:
  - `tier1_min`: Số tiền tối thiểu để kích hoạt mốc mưa tiền 1 (Mặc định: 0 VNĐ).
  - `tier2_min`: Số tiền tối thiểu để kích hoạt mốc mưa tiền 2 (Mặc định: 20,000 VNĐ).
  - `tier3_min`: Số tiền tối thiểu để kích hoạt mốc mưa tiền 3 (Mặc định: 50,000 VNĐ).
  - `tier4_min`: Số tiền tối thiểu để kích hoạt mốc mưa tiền 4 cực khủng (Mặc định: 100,000 VNĐ).

## Lưu ý chung:
- Sau khi chỉnh sửa file này, bạn **KHÔNG CẦN** khởi động lại server Nodejs, nhưng bạn **CẦN PHẢI F5 / Refresh** lại nguồn Browser Source của Alert trong OBS để mã nguồn đọc lại cấu hình mới nhất này.
- Hãy giữ nguyên định dạng JSON (Không được để sót hoặc thừa dấu phẩy `,` cuối dòng).
