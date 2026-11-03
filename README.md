# Blade Spirits Arena V9 - Eternal Realm

Phiên bản tổng hợp hoàn thiện hơn của game chiến đấu nhiều người chơi trên trình duyệt.

## Tính năng chính

- 6 kiếm sĩ nguyên bản với phong cách riêng.
- 2 chế độ chơi: PvP Arena và Co-op Săn Boss.
- Đấu trường bối cảnh đêm trăng với đèn lồng, cổng torii, tre và cánh hoa bay.
- Combo 3 đòn, tuyệt kỹ, né lướt, đỡ đòn.
- Linh dược hồi máu xuất hiện trên bản đồ.
- XP và cấp độ trong phiên chơi.
- Multiplayer qua Socket.IO.
- Dùng Three.js phục vụ nội bộ từ máy chủ, hạn chế lỗi CDN.

## Chạy local

```bash
npm install
npm start
```

Mở trình duyệt tại `http://localhost:3000`.

## Triển khai lên Render

- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variables: để trống

## Cấu trúc

```text
blade-spirits-arena-v9-ultimate/
├── package.json
├── server.js
├── README.md
└── public/
    ├── index.html
    ├── style.css
    └── game.js
```

## Ghi chú

Đây là prototype gameplay / visual demo. Mã nguồn đã được tổ chức để dễ nâng tiếp, nhưng vẫn cần kiểm thử thực tế trên GitHub + Render với nhiều người chơi.

## Bản sửa lỗi V9.1

- Khắc phục màn hình xem trước nhân vật trống và không thể vào trò chơi: Three.js 0.169 phân phối `three.module.js`, không phải `three.min.js`.
- Chuyển `game.js` sang ES Module và nạp thư viện trực tiếp từ `/vendor/three.module.js`.
- Thêm trạng thái lỗi mạng và lỗi khởi động.
- Chỉ đóng sảnh sau khi máy chủ xác nhận người chơi đã vào phòng.

Sau khi cập nhật ba file `public/index.html`, `public/game.js`, `README.md`, hãy deploy Render và hard refresh bằng Ctrl+Shift+R.

## V9.2 fix

Sửa lỗi `ReferenceError: rand is not defined` khi dựng bối cảnh. Bản ZIP V9.2 giữ bản sửa Three.js module từ V9.1.
