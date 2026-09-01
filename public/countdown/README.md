# Countdown Widget (Subathon Timer)

Tính năng này giúp bạn hiển thị một thanh đếm ngược thời gian trên luồng trực tiếp (rất phù hợp cho Subathon). Khi có người donate, hệ thống sẽ tự động cộng thêm thời gian vào giờ kết thúc.

## Cách sử dụng

Thêm một **Browser Source** vào OBS với đường dẫn:
`http://localhost:3000/countdown/index.html`

- Đặt chiều rộng (Width): `800`
- Đặt chiều cao (Height): `60` (hoặc to hơn một chút tuỳ ý)

## File Cấu Hình (`countdown.json`)

Mở file `countdown.json` nằm trong thư mục `public/countdown/` bằng Notepad để chỉnh sửa các thông số:

```json
{
  "title": "🔴 SUBATHON",
  "dateA": "2026-09-02T00:00:00+07:00",
  "dateB": "2026-09-02T12:00:00+07:00",
  "increment": 5
}
```

- **`title`**: Chữ hiển thị ở góc bên trái của thanh.
- **`dateA`**: Thời điểm bắt đầu của sự kiện (Định dạng chuẩn là YYYY-MM-DDTHH:MM:SS+07:00). Nó sẽ hiển thị ở giữa thanh cùng với thời gian đếm ngược.
- **`dateB`**: Thời điểm kết thúc hiện tại. Nó sẽ nằm ở góc bên phải.
- **`increment`**: Số phút tự động cộng thêm vào `dateB` mỗi khi nhận được 1 lượt donate. Ví dụ điền `5` nghĩa là cộng 5 phút.

**Lưu ý:**
- Bất cứ khi nào bạn chỉnh sửa và lưu file này, chỉ cần refresh lại Browser Source trên OBS là nó sẽ ăn cài đặt mới.
- Sau mỗi lần nhận donate, file này sẽ bị sửa đổi để cập nhật `dateB` mới nhất, giúp bạn không bị mất tiến trình nếu lỡ khởi động lại server.
