# Sân Đình Tuổi Thơ V5 — Multiplayer Hub

Phiên bản phát triển từ V4, giữ WebSocket game engine 4 trò online: Ô Ăn Quan, Cờ Gánh (biến thể đơn giản), Caro, Oẳn tù tì; thêm Sudoku solo.

## Cài đặt

Yêu cầu **Node.js >= 22.13** (sử dụng `node:sqlite`).

```bash
npm install
npm test
npm start
```

Mở `http://localhost:3000`.

### Âm nhạc

Đặt file MP3 **do bạn sở hữu hoặc được phép sử dụng** tại:

```
public/assets/audio/bgm.mp3
```

Đường dẫn bên ngoài website: `/assets/audio/bgm.mp3`. Nút `♬` trên thanh đầu bật/tắt nhạc, kéo thanh âm lượng trên desktop. Trình duyệt di động thường yêu cầu tương tác của người dùng trước khi phát nhạc. File âm thanh **không nằm trong ZIP**, vì chưa được gửi cùng dự án.

## Thay đổi V5

- **Bỏ phiếu chọn trò:** hai ghế cùng bình chọn; khi cùng chọn một trò, server mới chuyển game. Chọn lại game đang chơi cũng tạo ván mới nếu cả hai đồng ý. Chế độ solo tự chấp nhận phiếu của máy.
- **Bot 3 chế độ:** Dễ thiên ngẫu nhiên, Vừa heuristic có nhiễu, Khó heuristic tham lam ít nhiễu (không phải minimax/AI mạnh); server sinh nước đi hợp lệ.
- **Replay:** lưu snapshot cho mỗi lượt server xử lý; chọn ván trong lịch sử để xem, tua từng bước hay 0.5×–4×. Replay hiện là trạng thái bàn **2D dạng chữ** để hoạt động với mọi game; chưa có bản đồ họa cinematic/timeline vật lý.
- **SQLite:** `data/sandinh.sqlite` lưu kết quả và bản ghi replay. API `/api/stats` trả về tổng số ván theo game. Không có hệ thống tài khoản, vì vậy đây là thống kê ván, *không phải hồ sơ người chơi xác thực*.
- **Tùy chỉnh phòng:** 3 kiểu bàn, 3 tông ánh sáng (CSS), 3 mức bot. Mục “thời gian lượt” hiện chỉ là lựa chọn UI và **chưa xử phạt khi hết giờ**.
- **Sỏi:** nâng animation 2.5D thành cung bay, xoay và nảy nhẹ (mô phỏng bằng keyframes, **chưa có rigid-body collision solver**).
- **Sudoku:** giải một đề 9x9 offline, nhập số và kiểm tra. Chức năng “ván mới” đặt lại cùng đề; chưa sinh đề ngẫu nhiên.
- **Đã thêm trang giới thiệu** Cờ vua, Cờ tướng, Cờ vây, chưa có gameplay online. Đừng nhầm thẻ giới thiệu với game chạy được.

## Deploy Render

1. Backup GitHub hiện tại, đưa toàn bộ mã nguồn (bao gồm `games.js`, `rules.js`, `public`, `server.js`) lên repository.
2. Giữ tên dịch vụ trên Render và deploy commit mới.
3. Chọn **Node version >= 22.13**, kiểm tra `/health`, `/api/stats`, trang chủ và WebSocket.
4. Tải nhạc MP3 vào `public/assets/audio/bgm.mp3` nếu cần phát BGM.
5. **Render Free dùng ổ tạm**: file SQLite có thể biến mất khi redeploy/restart. Muốn lưu lâu dài, chuyển sang dịch vụ có **persistent disk** và đặt `DB_PATH=/var/data/sandinh.sqlite` (hoặc tự chuyển sang Postgres managed). Lịch sử/đường dẫn phòng trong RAM cũng sẽ mất khi máy chủ khởi động lại; replay đã lưu trong DB sẽ được giữ nếu đĩa bền vững còn tồn tại, nhưng cần mã phòng cũ và phiên phòng để yêu cầu qua WebSocket. Việc xây dựng hồ sơ cá nhân và tra cứu lịch sử trên nhiều phiên vẫn chưa hoàn thiện.
6. Không thay file nhạc bằng âm thanh thiếu quyền sử dụng.

## Đã kiểm tra

- `node --check` server/client: đạt
- `npm test`: 14/14 bài kiểm thử luật cũ đạt
- Chưa chạy kiểm thử WebSocket end-to-end trong môi trường tạo bản ZIP do `ws` chưa tải được (npm install bị timeout). Hãy thử cả hai trình duyệt trước khi phát hành rộng.

## Lưu ý quan trọng

Đây là bản phát triển **V5 thử nghiệm**, giữ code V2 người dùng từng chỉnh trong `user-v2-original` nhưng chưa tự động hợp nhất toàn bộ giao diện V2 vào V5. Cần kiểm chứng các thay đổi trên Render và sao lưu trước khi cập nhật. Bản V5 chưa đạt AAA 3D hay đối thủ AI chiến thuật hoàn chỉnh.
