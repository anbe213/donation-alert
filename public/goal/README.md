# Hướng dẫn cấu hình Goal Widget (goal.json)

File `goal.json` nằm trong thư mục này dùng để điều khiển toàn bộ hiển thị của Donation Goal trên màn hình stream của bạn. Hệ thống sẽ tự động đọc file này mỗi khi có người donate hoặc khi bạn F5 lại OBS.

Dưới đây là ý nghĩa của từng trường dữ liệu trong file:

- `title`: (Chuỗi ký tự) Tên của mục tiêu donate (VD: "Bills + BlizzCon Expenses").
- `target`: (Số nguyên) Số tiền mục tiêu mà bạn muốn đạt được.
- `current`: (Số) Số tiền hiện tại đã quyên góp được. **Hệ thống sẽ tự động cộng thêm tiền vào trường này mỗi khi có người donate, bạn hiếm khi cần tự sửa trừ khi muốn reset lại từ đầu.**
- `type`: (Chuỗi ký tự) Giao diện hiển thị của Goal. Chỉ nhận 1 trong 2 giá trị:
  - `"bar"`: Hiển thị giao diện thanh ngang tiêu chuẩn (Kèm nhân vật chạy trên đầu).
  - `"potion"`: Hiển thị giao diện bình thủy tinh nghiêng (Bình chứa chất lỏng).
- `enemySize`: (Số) Phóng to hoặc thu nhỏ nhân vật chạy trên thanh ngang (Chỉ áp dụng khi dùng `type: "bar"`).
  - `1`: Kích thước chuẩn mặc định.
  - `2`: Phóng to gấp 2 lần.
  - `0.5`: Thu nhỏ một nửa.

## Ví dụ mẫu:
```json
{
  "title": "Mua máy tính mới",
  "target": 10000000,
  "current": 2500000,
  "type": "bar",
  "enemySize": 1.5
}
```

## Lưu ý:
- Nếu bạn đổi `title`, `target`, `type`, hoặc `enemySize`, hãy nhớ lưu file lại và **Refresh (F5) lại bộ nhớ cache của nguồn Browser trong OBS** để thay đổi có hiệu lực ngay lập tức.
- Không được đặt dấu phẩy `,` thừa ở dòng cuối cùng của file json để tránh lỗi đọc file.
