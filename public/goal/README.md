# Hướng dẫn cấu hình Goal Widget (goal.json)

File `goal.json` nằm trong thư mục này dùng để điều khiển toàn bộ hiển thị của Donation Goal trên màn hình stream của bạn. Hệ thống sẽ tự động đọc file này mỗi khi có người donate hoặc khi bạn F5 lại OBS.

Dưới đây là ý nghĩa của từng trường dữ liệu trong file:

- `title`: (Chuỗi ký tự) Tên của mục tiêu donate (VD: "Bills + BlizzCon Expenses").
- `target`: (Số nguyên) Số tiền mục tiêu mà bạn muốn đạt được.
- `current`: (Số) Số tiền hiện tại đã quyên góp được. **Hệ thống sẽ tự động cộng thêm tiền vào trường này mỗi khi có người donate, bạn hiếm khi cần tự sửa trừ khi muốn reset lại từ đầu.**
- `type`: (Chuỗi ký tự) Giao diện hiển thị của Goal. Nhận 1 trong các giá trị:
  - `"mid-autumn"`: **Giao diện Trung Thu 4 bậc Goal** (Kèm khung ảnh đời thường, thanh vàng ánh trăng, ẩn số tiền và chỉ hiện title theo từng bậc goal).
  - `"bar"`: Hiển thị giao diện thanh ngang tiêu chuẩn (Kèm nhân vật chạy trên đầu).
  - `"potion"`: Hiển thị giao diện bình thủy tinh nghiêng (Bình chứa chất lỏng).
- `mid_autumn`: (Khối đối tượng riêng) Cấu hình 4 bậc Goal cho phiên bản Trung Thu. Được bọc trong một ngoặc `{}` to để dễ chỉnh sửa và không ảnh hưởng đến các theme khác:
  - `goals`: Danh sách 4 bậc mục tiêu. Mỗi bậc bao gồm:
    - `target`: Mốc tiền đạt được cho bậc này (VNĐ).
    - `title`: Tiêu đề riêng cho bậc này (Sẽ hiển thị chính giữa thanh bar thay cho số tiền).
    - `image`: Đường dẫn đến ảnh đời thường muốn hiển thị trong khung (VD: `"assets/anh_cua_ban.jpg"`). Ảnh sẽ được tự động cắt gọt vừa vặn trong khung và không bị tràn viền.

## Ví dụ mẫu phiên bản Trung Thu ("mid-autumn"):
```json
{
  "title": "Stream Trung Thu",
  "target": 1000000,
  "current": 0,
  "type": "mid-autumn",
  "mid_autumn": {
    "goals": [
      {
        "target": 500000,
        "title": "Mục tiêu 1: Rước Đèn Ông Sao",
        "image": "assets/mid_autumn_1.svg"
      },
      {
        "target": 1000000,
        "title": "Mục tiêu 2: Bánh Dẻo Đậu Xanh",
        "image": "assets/mid_autumn_2.svg"
      },
      {
        "target": 1500000,
        "title": "Mục tiêu 3: Múa Lân Phá Cỗ",
        "image": "assets/mid_autumn_3.svg"
      },
      {
        "target": 2000000,
        "title": "Mục tiêu 4: Ngắm Trăng Rằm Đoàn Viên",
        "image": "assets/mid_autumn_4.svg"
      }
    ]
  }
}
```

## Cách test nhanh Goal trên trình duyệt:
Khi Server đang chạy, bạn có thể mở tab trình duyệt để thử:
- Đặt số tiền hiện tại thành 250,000đ (test Goal 1 50%): `http://localhost:3000/api/goal/test?set=250000`
- Đặt số tiền hiện tại thành 750,000đ (test Goal 2 50%): `http://localhost:3000/api/goal/test?set=750000`
- Đặt số tiền hiện tại thành 1,500,000đ (test mở khóa Goal 4): `http://localhost:3000/api/goal/test?set=1500000`
- Reset về 0: `http://localhost:3000/api/goal/test?reset=0`

## Lưu ý:
- Nếu bạn đổi `title`, `target`, `type`, hoặc `enemySize`, hãy nhớ lưu file lại và **Refresh (F5) lại bộ nhớ cache của nguồn Browser trong OBS** để thay đổi có hiệu lực ngay lập tức.
- Không được đặt dấu phẩy `,` thừa ở dòng cuối cùng của file json để tránh lỗi đọc file.
