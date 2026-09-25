# Hướng dẫn sử dụng Mid-Autumn Screen Decor (/autumn)

Trang `/autumn` cung cấp khung trang trí phong cách Trung Thu toàn màn hình độc lập dành cho OBS Studio, Streamlabs, hoặc Prism Live Studio.

## 1. Cách thêm vào OBS Studio:
1. Trong OBS, tạo một nguồn mới: **Browser Source** (Trình duyệt).
2. Điền URL:
   - Khi chạy local: `http://localhost:3000/autumn`
   - Hoặc qua link ngrok khi stream từ xa.
3. Cài đặt kích thước:
   - **Width**: `1920` (hoặc chiều rộng màn hình stream của bạn).
   - **Height**: `1080` (hoặc chiều cao màn hình stream của bạn).
4. Tích chọn: **Shutdown source when not visible** và **Refresh browser when scene becomes active**.
5. Nền trang hoàn toàn trong suốt (`transparent`) và không cản trở thao tác chuột (`pointer-events: none`).

## 2. Các điểm cải tiến:
- **Viền sát mép màn hình**: Không còn khoảng đệm padding 12px cũ, đường viền dát vàng và 4 góc cổ phong bám sát 100% 4 cạnh màn hình.
- **Lồng đèn dịch chuyển vào giữa**: Đã dịch chuyển vào thêm ~100px (mặc định cách mép trái/phải `155px`), tạo bố cục hài hòa, không bị che bởi khung viền hay mép màn hình.

## 3. Tùy chỉnh qua file `autumn.json`:
Bạn có thể chỉnh sửa file `autumn.json` trong thư mục này:
- `lantern_offset`: Khoảng cách lồng đèn từ 2 bên mép vào giữa tính theo pixel (mặc định `155`).
- `lantern_left_text`: Chữ trên lồng đèn trái (mặc định `"中"`).
- `lantern_right_text`: Chữ trên lồng đèn phải (mặc định `"秋"`).
- `show_border`: `true` / `false` (bật/tắt đường viền 4 cạnh).
- `show_corners`: `true` / `false` (bật/tắt 4 góc hoa văn cổ phong).
- `show_lanterns`: `true` / `false` (bật/tắt 2 lồng đèn).
- `show_moon`: `true` / `false` (bật/tắt cụm trăng rằm và mây trôi).
- `show_stardust`: `true` / `false` (bật/tắt các đốm tinh tú bay lơ lửng).
