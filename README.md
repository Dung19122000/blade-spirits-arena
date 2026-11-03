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
