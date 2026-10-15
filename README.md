# Sân Đình Tuổi Thơ V4 – bản nâng cấp đa trò chơi

Dựa trên hệ thống V3 (4 trò online) và các tệp V2 do người dùng chỉnh sửa. Ba tệp nguyên gốc được giữ trong `user-v2-original/` để không làm mất các thay đổi, nhất là giao diện và đoạn cấu hình nhạc nền. Giao diện chạy của V4 dùng nền V3 multiplayer; **không phải toàn bộ sửa đổi V2 đã được tự động hợp nhất vào V4**.

## Có gì mới
- Lịch sử tối đa 30 ván **trong một phòng**: ghi khi kết thúc, đổi trò hoặc rời; xuất JSON. Dữ liệu nằm trong RAM nên mất khi Render restart/sleep.
- Luyện tập với máy cho Ô Ăn Quan, Cờ Gánh, Caro, Oẳn tù tì. Bot luật hợp lệ trên server; độ mạnh còn cơ bản, chưa phải AI chiến thuật sâu.
- Đổi trò giữ nguyên phòng, lưu ván đang chơi vào lịch sử trước khi đổi.
- Hiệu ứng đặt quân Cờ Gánh, Caro, lật tay Oẳn tù tì. Giữ lại hoạt ảnh rải sỏi Ô Ăn Quan có sẵn.
- Vẫn sử dụng một mã phòng, góc nhìn xoay riêng cho Ô Ăn Quan, emoji và trạng thái báo lượt V3.

## Chạy
`npm install` → `npm test` → `npm start`, truy cập `http://localhost:3000`. Trên Render dùng dịch vụ Node web, `npm install`, `npm start`, `render.yaml` có sẵn. Đẩy thư mục V4 (không phải thư mục mẹ) lên repo GitHub đang được Render kết nối rồi deploy.

## Hạn chế
- Chế độ luyện tập dùng một mã nội bộ nhưng không cho người thứ hai vào.
- Lịch sử chưa bền vững: cần SQLite/Postgres để lưu lâu dài và tài khoản/guest-id nếu muốn lưu qua nhiều phòng.
- Hoạt ảnh chưa phải mô phỏng vật lý 3D thật.
- Nhạc `bgm.mp3` của bản V2 không có trong ba tệp upload, nên V4 không thể phục hồi bản nhạc thiếu đó.
- Hệ thống V3 được dùng làm lõi thay vì ghi đè bằng app.js V2, vì backend của hai phiên bản khác giao thức.
