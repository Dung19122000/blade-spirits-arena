# BLADE SPIRITS ARENA V5 — Combo & Guardian

Bản V5 tiếp tục từ V4, giữ **PvP**, **Co-op săn Boss**, **6 kiếm sĩ**, **linh dược hồi 42 HP / hồi sinh 12 giây**, phòng 12 người và chơi trên điện thoại/PC.

## Nâng cấp V5

- **Combo 3 hit:** Chém liên tục (J hoặc click / nút CHÉM) trong 1,15 giây để nối chuỗi 1→2→3; đòn 2 mạnh hơn 13%, đòn 3 mạnh hơn 50% và có tầm đánh dài hơn. Máy chủ quyết định combo và sát thương.
- **Đỡ đòn:** Bấm **L** trên PC hoặc **ĐỠ** trên điện thoại; giảm 75% sát thương PvP và 70% đòn Boss trong 650ms, hồi 2,8 giây. Server kiểm tra thời gian và thiệt hại.
- **Hoạt ảnh:** Phân biệt vung kiếm của 3 nhịp combo, tư thế đỡ, nhún và xoay thân, kết hợp chuyển động procedural của V4.
- HUD combo mới và hiệu ứng đỡ đòn.

## Cài đặt

Node.js 20+; trong thư mục chứa package.json chạy `npm install` rồi `npm start`. Mở http://localhost:3000 ; kiểm tra /health. Có thể triển khai lên Render Web Service (Build: `npm install`, Start: `npm start`) trên repo `blade-spirits-arena` cũ.

## Điều khiển

WASD di chuyển, chuột định hướng; J / click chém combo; K / Space tuyệt kỹ; Shift né; **L đỡ đòn**. Trên điện thoại sử dụng joystick và các nút ảo. Di chuyển tới bình xanh để hồi máu.

## Giới hạn

Prototype Three.js, mô hình nhân vật nguyên bản dựng procedural, chưa có rig/mocap hoặc animation chuyên nghiệp, chưa đảm bảo chơi mượt trên mọi máy. Chưa kiểm thử thực tế nhiều máy với Render. Không dùng tài sản Demon Slayer.
