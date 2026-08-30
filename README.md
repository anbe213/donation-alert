# Hệ Thống OBS Donation Alert (APIBank)

Ứng dụng giúp hiển thị thông báo quyên góp (donate) trên luồng stream (OBS) khi người xem chuyển khoản vào tài khoản ngân hàng của bạn. Hệ thống sử dụng dịch vụ trung gian APIBank để bắt giao dịch tự động.

## 🚀 Hướng Dẫn Cài Đặt Dành Cho Streamer

### Bước 1: Yêu cầu hệ thống
- Tải và cài đặt **Node.js** (Bản LTS) tại: https://nodejs.org/

### Bước 2: Cấu hình mã bảo mật
1. Mở thư mục chứa mã nguồn.
2. Tìm file có tên `.env.example`, copy nó ra và đổi tên thành `.env` (chú ý có dấu chấm ở đầu).
3. Chuột phải vào file `.env` chọn "Open with -> Notepad".
4. Truy cập trang web `https://apibank.com.vn/client/webhooks-v3` của bạn. Tạo mới một webhook.
5. Sao chép phần **Webhook Secret** trên web và dán vào file `.env` ở dòng `WEBHOOK_SECRET=...`
6. Lưu file lại.

### Bước 3: Khởi chạy ứng dụng
1. Click đúp chuột vào file **`run.bat`**.
2. Nếu là lần đầu chạy, phần mềm sẽ tự động tải các thư viện cần thiết.
3. Khi màn hình đen xuất hiện thông báo "NGROK ĐÃ KẾT NỐI THÀNH CÔNG", hãy copy đường link có dạng `https://xxxx.ngrok-free.app/api/apibank/webhook`.
4. Quay lại trang APIBank, dán link vừa copy vào ô URL của Webhook bạn vừa tạo.

### Bước 4: Đưa vào OBS
1. Mở phần mềm OBS.
2. Tại mục **Sources** (Nguồn), ấn dấu `+` và chọn **Browser** (Trình duyệt).
3. Đặt tên (VD: Donation Alert).
4. Tại ô URL, dán dòng chữ sau vào: `http://localhost:3000/alert/index.html`
5. Khung Width x Height tuỳ bạn (thường là 1920x1080 hoặc tuỳ chỉnh theo khung hình).
6. Test bằng cách giả lập gửi Webhook trên giao diện APIBank.

## 🎨 Cách Đổi Hình Ảnh và Âm Thanh

Bạn có thể tự thay đổi hình ảnh và âm thanh của riêng mình bằng cách:
1. Vào thư mục `public/alert/assets/`.
2. Thay thế file `default.gif` bằng ảnh của bạn (nhớ đặt tên đúng thành `default.gif`).
3. Thay thế file `default.mp3` bằng bài nhạc bạn thích (nhớ giữ tên `default.mp3`).
4. Bật tắt file `run.bat` lại là xong.

## 🔗 Làm Sao Để Link Webhook Không Bị Đổi Mỗi Ngày?
Mặc định, Ngrok sẽ sinh link ngẫu nhiên mỗi lần bật máy tính. Để cố định link này:
1. Tạo 1 tài khoản miễn phí tại https://ngrok.com
2. Tìm dòng Authtoken trên Dashboard của Ngrok.
3. Bật mục Static Domain để lấy tên miền tĩnh.
4. Mở file `.env`, dán token vào `NGROK_AUTHTOKEN=...` và tên miền vào `NGROK_DOMAIN=...`
