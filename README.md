# BLADE SPIRITS ARENA — 3D Multiplayer

Game đấu kiếm 3D trên trình duyệt với **6 kiếm sĩ giả tưởng nguyên bản**: Hỏa Vệ, Thủy Ảnh, Lôi Phong, Hoa Kiếm, Băng Tinh, Dạ Kiếm. Không sử dụng nhân vật, trang phục, hình ảnh, nhạc hay tên thương hiệu của Demon Slayer. Các kỹ năng lấy cảm hứng chung từ nguyên tố thiên nhiên.

## Chơi trên máy tính

```bash
npm install
npm start
```

Truy cập `http://localhost:3000`. Cần Node.js 20 trở lên.

## Chơi cùng bạn bè trên Internet (Render)

1. Tạo repository **mới** trên GitHub, ví dụ `blade-spirits-arena`. Upload `package.json`, `server.js`, `README.md` và cả thư mục `public/`.
2. Render → New → Web Service → kết nối repository vừa tạo.
3. Runtime: **Node**; Build Command: `npm install`; Start Command: `npm start`; chọn gói phù hợp (Free nếu có).
4. Sau khi trạng thái **Live**, mở link HTTPS được cấp, chọn nhân vật và vào phòng.
5. Nhấn **Sao chép link phòng** để gửi cho bạn bè. Mọi người dùng cùng mã phòng; tối đa 12 người/phòng.

## Điều khiển

- PC: WASD hoặc phím mũi tên di chuyển; rê chuột để xoay hướng; J hoặc click trái để chém; K hoặc Space để dùng tuyệt kỹ.
- Điện thoại: joystick trái di chuyển; nút **CHÉM** và **TUYỆT KỸ** bên phải. Hướng đánh theo hướng di chuyển.

## Giới hạn bản thử nghiệm

- Đây là prototype chiến đấu arena có hồi sinh, **không phải** trò chơi Demon Slayer chính thức.
- Nhân vật là mô hình dựng từ hình khối, chưa có animation rigged, kỹ năng phức tạp, bot AI, đấu hạng hay đăng nhập tài khoản.
- Dữ liệu phòng giữ trong RAM và mất khi Render khởi động lại. Một máy chủ xử lý các phòng; chưa có anti-cheat hoàn chỉnh.
- Server kiểm soát máu, sát thương, hồi chiêu và tốc độ chạy, nhưng chưa có hệ thống vật cản/collision nâng cao.
- Máy chủ tự phục vụ thư viện Three.js từ node_modules; không cần tải ảnh hay model từ CDN.

## Quyền sử dụng

Mã nguồn được tạo riêng cho dự án này và có thể chỉnh sửa, sử dụng làm nền tảng game của bạn. Mọi hình khối là hình học thủ tục; không có asset hình ảnh sao chép từ anime hay hãng xe.
