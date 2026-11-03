# BLADE SPIRITS ARENA V6 — SPIRIT REFORGED

Prototype game đấu kiếm 3D **nhân vật nguyên bản**; hỗ trợ **PvP** và **Co-op săn Boss** (tối đa 12 người/phòng theo cấu hình server). Kế thừa cơ chế V5: combo 3 đòn, đỡ đòn, né, tuyệt kỹ, bình hồi máu (+42 HP, xuất hiện lại sau 12 giây).

## Nâng cấp V6
- Kiếm sĩ 3D có tóc nhiều lớp, mắt, phụ kiện áo giáp, thắt lưng, dải vải phụ và đèn kiếm, với bảng màu riêng cho 6 nhân vật. Các mẫu được **dựng bằng Three.js**, không dùng hình ảnh hay model nhân vật có bản quyền.
- Hoạt ảnh vải bổ sung, nhịp chạy và vung kiếm chuyển tiếp mềm bằng nội suy theo thời gian thực.
- Tối ưu cấu hình bóng đổ và độ phân giải khi chơi trên thiết bị cảm ứng.
- Chỉnh giao diện chọn nhân vật và HUD.

## Cài và chạy
````bash
npm install
npm start
````
Mở `http://localhost:3000`. Trên Render: Web Service Node, Build `npm install`, Start `npm start`, gói Free nếu phù hợp. Thay **toàn bộ file** trong repository cũ và Commit; kiểm tra Render triển khai phiên bản mới.

## Điều khiển
WASD di chuyển, J/click chém, K/Space tuyệt kỹ, Shift né, L đỡ. Điện thoại có joystick và các nút cảm ứng. Nhặt bình hồi máu bằng cách lại gần.

## Giới hạn
Đây là cải tiến **procedural 3D**, không phải nhân vật skinned/rigged có clip animation chuyên nghiệp. Cần kiểm tra trực tiếp trên trình duyệt và nhiều thiết bị khi triển khai. Không dùng tài sản hoặc nhân vật Demon Slayer chính thức.
