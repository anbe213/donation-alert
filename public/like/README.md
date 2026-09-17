# Hướng dẫn cấu hình Like Goal Widget (like.json)

Tính năng này giúp bạn hiển thị một **Bình Thủy Tinh Ma Thuật chứa dung dịch xanh biển** trên luồng livestream để theo dõi tiến trình Like Goal (Mục tiêu lượt thích) theo thời gian thực. Mỗi khi có người bấm Like trên YouTube Live, sẽ có các giọt nước xanh ma thuật rơi từ trên cao xuống bình và làm dâng mực nước lên.

---

## 1. Cách gắn vào phần mềm OBS

1. Trong OBS Studio, tại mục **Sources (Nguồn)**, bấm dấu `+` và chọn **Browser (Trình duyệt)**.
2. Đặt tên nguồn: `Like Goal`.
3. Điền thông số:
   - **URL**: `http://localhost:3000/like/index.html`
   - **Width (Chiều rộng)**: `350`
   - **Height (Chiều cao)**: `500`
4. Bấm **OK**.

---

## 2. File Cấu Hình (`like.json`)

Mở file `public/like/like.json` bằng Notepad để điều chỉnh các thông số:

```json
{
  "title": "MỤC TIÊU LIKE",
  "current": 0,
  "target": 100,
  "youtube_video_id": "jfKfPfyJRdk",
  "poll_interval_seconds": 15
}
```

- **`title`**: Tiêu đề hiển thị phía trên số like (Mặc định: `"MỤC TIÊU LIKE"`).
- **`current`**: Số like hiện tại. Hệ thống sẽ tự động cập nhật số này từ YouTube Live hoặc bạn có thể chỉnh tay số khởi đầu.
- **`target`**: Mục tiêu số like bạn mong muốn đạt được (Ví dụ: `100` hoặc `500`).
- **`youtube_video_id`**: Mã Video ID của buổi livestream trên YouTube.
  - *Cách lấy ID:* Nếu link livestream của bạn là `https://www.youtube.com/watch?v=jfKfPfyJRdk` thì Video ID là **`jfKfPfyJRdk`**.
  - *Nếu để trống `""`:* Hệ thống sẽ chạy ở chế độ thủ công (bạn có thể tự sửa số `current` hoặc dùng link test bên dưới).
- **`poll_interval_seconds`**: Thời gian giữa mỗi lần quét số like trên YouTube (Mặc định: `15` giây).

---

## 3. Cách Test Nhanh Hiệu Ứng Giọt Nước Rơi

Khi Server đang chạy, bạn có thể mở một tab mới trên trình duyệt và truy cập:

- Thử rơi **1 giọt nước** (+1 Like):
  `http://localhost:3000/api/like/test?delta=1`
- Thử rơi **5 giọt nước** (+5 Like):
  `http://localhost:3000/api/like/test?delta=5`
- Reset số like về 0:
  `http://localhost:3000/api/like/test?reset=0`
