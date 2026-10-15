# Sân Đình Tuổi Thơ — V6 (prototype multiplayer)

Bản nâng cấp từ V5. **Vui lòng sao lưu repository / dữ liệu hiện tại trước khi deploy.**

## Tính năng V6

- **Một nút âm thanh** 🔊/🔇 điều khiển cả nhạc nền và tiếng hiệu ứng; desktop có thanh âm lượng nhạc. Nhạc lấy tại `public/assets/audio/bgm.mp3` (từ `public/index.html` là `./assets/audio/bgm.mp3`). **ZIP không bao gồm MP3**, hãy chép file của bạn vào đúng vị trí. Mobile tự yêu cầu thao tác bấm trước khi phát.
- **Sudoku mới:** 4 mức Dễ / Vừa / Khó / Chuyên gia (phân chia sơ bộ bằng số ô gợi ý, không phải độ khó suy luận được đánh giá bởi solver chuyên nghiệp); mỗi đề sinh ngẫu nhiên và **kiểm tra có một nghiệm duy nhất**. Bàn số chạm trên điện thoại, tô liên quan hàng/cột/khối, phát hiện số trùng, ghi chú nhỏ, hoàn tác, xoá ô, gợi ý, kiểm tra, tính giờ, tự lưu đề dang dở và thành tích (số đề đã giải, kỷ lục thời gian, đề giải không dùng gợi ý). **Sudoku lưu bằng localStorage trên thiết bị**, không đồng bộ giữa các trình duyệt.
- **Cờ vua:** 8×8, 2 người trực tuyến hoặc chơi với bot; luật đi quân, chiếu, chiếu bí, pat, nhập thành, bắt tốt qua đường, tự phong hậu, hòa 50 nước mỗi bên. **Chưa xử lý hòa do lặp ba lần vị trí, vật chất không đủ chiếu bí và lựa chọn phong thành xe/mã/tượng**. Bộ luật là phiên bản thực dụng, chưa chứng nhận tương thích toàn bộ FIDE.
- **Cờ tướng:** 9×10, quân Xe/Mã/Tượng/Sĩ/Tướng/Pháo/Tốt, phép đi hợp lệ, cản chân mã, cản mắt tượng, cung, sông, pháo ăn qua màn, hai tướng đối mặt, chiếu và hết nước. **Chưa hỗ trợ luật cấm chiếu đuổi liên tục, hòa theo quy tắc giải đấu**.
- **Cờ vây:** 9×9, đen đi trước, đánh tại giao điểm trống, bắt nhóm hết khí, cấm tự sát, ko đơn giản, nút **Qua lượt**, hai lần qua liên tiếp tính điểm theo **Chinese area scoring** với komi 5.5 cho Trắng. **Chưa hỗ trợ superko, xác nhận sống/chết và thương lượng quân chết khi kết thúc trận**; nên coi là luật giản lược cho chơi vui.
- Các game mới có **server-side validation**, chọn quân + chấm gợi ý nước hợp lệ, xoay bàn theo ghế 2, giữ một mã phòng để bình chọn đổi game, emoji, replay snapshot, ba mức bot heuristic và lịch sử SQLite từ V5.
- Màn **Góc ký ức** hiển thị thành tích Sudoku của thiết bị và tổng số ván mỗi trò đang lưu trong SQLite (tổng hợp công khai, không phải hồ sơ cá nhân đã xác thực).

## Cài đặt local

Yêu cầu Node.js **>= 22.13** (vì `node:sqlite`), npm.

```bash
npm install
npm test
npm start
```

Truy cập `http://localhost:3000`.

`npm test` chạy 24 test (14 test cũ và 10 test mới cho ba trò + Sudoku) trong bản đóng gói này.

### Kiểm tra nhiều thiết bị

1. Mở trang trên laptop, **Tạo phòng**.
2. Gửi mã 6 ký tự hoặc copy link cho điện thoại.
3. Cả hai chọn **cùng một trò** ở phòng chờ.
4. Thử chơi 2 lượt, gửi emoji, trở lại phòng và đổi trò, dùng Replay trong nhật ký sau khi ván kết thúc/đổi trò.
5. Thử đổi người tạo phòng và hướng nhìn để kiểm tra góc nhìn thứ hai.

## Cập nhật Render

1. **Sao lưu** GitHub repository đang phục vụ V5 (nên tạo branch `backup-v5`).
2. Tải nội dung ZIP V6 lên cùng repository (đặt `server.js`, `games.js`, `rules.js`, `strategy-games.js`, `package.json`, `render.yaml` và thư mục `public/` ở thư mục gốc).
3. Chép lại file nhạc **do bạn sở hữu quyền sử dụng** tại `public/assets/audio/bgm.mp3`. Giữ nguyên path.
4. Push commit; Render service hiện có sẽ tự deploy hoặc chọn **Manual Deploy → Deploy latest commit**.
5. Kiểm tra `https://<your-render-domain>/health` thấy `games:7`, vào trang, kiểm tra các trò mới và hai thiết bị cùng phòng.
6. Nếu trang vẫn cũ, reload mạnh (Ctrl+Shift+R), đợi Service Worker nâng cấp; cache key V6 khác V5.

## Lưu dữ liệu bền vững

SQLite sử dụng `DB_PATH` (mặc định `./data/sandinh.sqlite`). **Filesystem của Render Free có thể bị xóa khi restart/redeploy**, vì vậy SQLite không phải phương án bền vững ở gói Free. Nếu có persistent disk, đặt `DB_PATH` tới nơi lưu vĩnh viễn (ví dụ `/var/data/sandinh.sqlite`). Nếu phải dùng Render Free lâu dài, nên chuyển sang PostgreSQL managed. Bộ nhớ RAM phòng đang mở vẫn bị xoá khi server restart; cần lưu session/room để phục hồi trận xuyên restart.

Sudoku localStorage vẫn tồn tại trên **cùng một trình duyệt/thiết bị** (trừ khi xoá dữ liệu website). Đây không phải đồng bộ tài khoản xuyên thiết bị.

## Lưu ý chất lượng/kiểm thử

- Đã chạy 24/24 unit tests (bao gồm kiểm tra cờ vua chiếu bí, nhập thành, luật tướng không đối mặt, cờ vây khí/tự sát, Sudoku nghiệm duy nhất), kiểm tra cú pháp server và client, rà soát ID tham chiếu trong HTML.
- Chưa kiểm tra end-to-end bằng hai thiết bị thật: môi trường này không cài được gói `ws` do truy cập npm bị lỗi DNS. Vì vậy hãy test multiplayer và bot trực tiếp sau khi deploy Render **trước khi mời nhiều người**.
- Chưa có công cụ AI engine chuyên sâu (Stockfish, KataGo, Fairy-Stockfish); bot **Dễ/Vừa/Khó là heuristic** với nhiễu, không đạt trình độ cờ chuyên nghiệp.
- Chưa tích hợp tất cả những chỉnh sửa riêng trong `user-v2-original`; thư mục lưu bản gốc của người dùng để tham khảo.
- Các quân/hiệu ứng dùng CSS/WebGL 2.5D; chưa phải rigid-body physics hoặc hình ảnh AAA hoàn chỉnh.
