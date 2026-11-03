# BLADE SPIRITS ARENA V2 — PvP & Boss Co-op

Game kiếm sĩ fantasy 3D nguyên bản. Không sử dụng tài sản Demon Slayer.

## Chế độ
- **PvP:** Người chơi trong cùng mã phòng đấu với nhau; hạ gục và hồi sinh.
- **Boss Co-op:** Người chơi cùng phòng hợp lực chống thủ lĩnh AI; Boss đuổi người gần nhất, đánh phạm vi, chuyển pha khi dưới 45% máu, tăng sức mạnh qua từng đợt. Trong chế độ này kiếm sĩ không gây sát thương cho nhau.
- Mỗi phòng tối đa 12 người. Hai chế độ cần mã phòng khác nhau.

## Triển khai Render
1. Tạo repository GitHub riêng, tải toàn bộ nội dung thư mục này lên (giữ `public/index.html`, `public/style.css`, `public/game.js`).
2. Render → New → Web Service → chọn repository.
3. Language Node, build `npm install`, start `npm start`, gói Free.
4. Khi Live, mở đường link HTTPS, chọn chế độ và nhân vật; mời bạn bè dùng nút sao chép link.

## Chạy tại máy
```bash
npm install
npm start
```
Mở http://localhost:3000

## Điều khiển
WASD di chuyển; chuột định hướng; J / click chém; K / Space tuyệt kỹ. Điện thoại dùng joystick và hai nút kỹ năng.

## Giới hạn bản thử nghiệm
- Đồ họa nhân vật được dựng bằng Three.js (stylized) chứ chưa phải model anime rigged.
- Chuyển động vị trí dùng nội suy, game không có matchmaking, lưu tài khoản hay chống gian lận cấp production.
- Nếu Render Free ngủ, lượt kết nối đầu có thể chậm.
- Chỉ dùng một instance server; trạng thái phòng lưu trong RAM.
