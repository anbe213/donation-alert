# Countdown Widget (Subathon Timer)

Tính năng này giúp bạn hiển thị một thanh tiến trình đếm giờ lên (hoặc lùi tuỳ thiết lập) trên luồng trực tiếp (rất phù hợp cho Subathon). Khi có người donate, hệ thống sẽ tự động cộng thêm thời gian vào giờ kết thúc.

## Cách sử dụng

Thêm một **Browser Source** vào OBS với đường dẫn:
`http://localhost:3000/countdown/index.html`

- Đặt chiều rộng (Width): `800`
- Đặt chiều cao (Height): `60`

## File Cấu Hình (`countdown.json`)

Mở file `countdown.json` nằm trong thư mục `public/countdown/` bằng Notepad để chỉnh sửa các thông số:

```json
{
  "title": "🔴 SUBATHON",
  "start": "00:00:00",
  "end": "12:00:00",
  "limit": "18:00:00",
  "incrementPerHundred": 60,
  "real_start_time": ""
}
```

- **`title`**: Chữ hiển thị ở góc bên trái của thanh.
- **`start`**: Thời lượng bắt đầu, định dạng HH:MM:SS (thường là `00:00:00`). Nó sẽ hiển thị ở giữa thanh cùng với thời gian đang đếm.
- **`end`**: Thời lượng kết thúc mục tiêu hiện tại (Ví dụ: `12:00:00`). Nó sẽ nằm ở góc bên phải.
- **`limit`**: Thời lượng tối đa (Ví dụ: `18:00:00`). Khi nhận donate, `end` tăng lên sẽ không bao giờ được phép vượt qua `limit` này.
- **`incrementPerHundred`**: Số phút được cộng thêm vào `end` cho **mỗi 100,000 VNĐ** donate.
  - *Ví dụ:* Nếu để `60`, ai đó donate 100k -> cộng 60 phút. Donate 50k -> cộng 30 phút. Donate 10k -> cộng 6 phút.
- **`real_start_time`**: Đây là mốc thời gian hệ thống lưu lại lúc thanh trượt bắt đầu chạy. Bạn hãy để rỗng `""`, phần mềm sẽ tự điền mốc thời gian lúc server chạy. 
  - **Cách RESET lại bộ đếm từ đầu:** Xoá giá trị ở trường này thành chuỗi rỗng `""` và lưu lại file, hệ thống sẽ tự động bắt đầu tính giờ lại từ mốc `start`.

**Lưu ý:**
- Sau mỗi lần nhận donate, file này sẽ bị sửa đổi để tự động cập nhật `end` mới nhất, giúp bạn không bị mất tiến trình nếu lỡ khởi động lại server.
