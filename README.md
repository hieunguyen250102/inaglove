# In a Grove · Trong lùm cây — bản online

Bản web realtime (fan-made, phi thương mại) của trò chơi suy luận **In a Grove** (Oink Games, bản Revised 2021), cho 2–5 người, có chat realtime.

- Luật theo bản **Revised 2021**: 9 quân (2–8 và hai quân X), 7 chip mỗi màu, dấu *Đi đầu* và *Chưa xem*, tối đa 7 vụ án, từ 5 chip phạt là kết thúc.
- Hình ảnh được vẽ lại bằng SVG từ bộ hình tự làm trong `images/`, theo phong cách giấy washi, mực chàm và đỏ son (không dùng neon).
- Có hiệu ứng động: chia quân, lật quân 3D, chuyền quân ngoại phạm, chip bay vào chồng, đóng dấu "Hung thủ", chip phạt bay về người nhận, rừng tre lay động, emoji bay trên ghế.
- Realtime chat có trạng thái "đang nhập…" và thả cảm xúc nhanh.
- Có thể vào lại phòng sau khi mất kết nối hoặc tải lại trang. Nếu một người vắng mặt quá 20 giây khi đến lượt, hệ thống sẽ đi thay họ. Người vào sau khi ván đã bắt đầu sẽ được xem.

## Chạy trên máy

Yêu cầu Node.js 20 trở lên.

```bash
npm install
```

```bash
npm run dev
```

Mở http://localhost:5173. Để chơi thử một mình, mở thêm tab và dùng mã phòng: mỗi tab là một người chơi riêng.

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy server (:3001) và client Vite (:5173, proxy `/socket.io`) |
| `npm test` | Test luật chơi phía server (vitest) |
| `npm run typecheck` | Kiểm tra kiểu cả server lẫn client |
| `npm run build` | Build client (`client/dist`) và server (`server/dist`) |
| `npm start` | Chạy server production. Server tự phục vụ `client/dist` nếu thư mục này có. |

## Deploy

Vercel không giữ được kết nối WebSocket lâu dài, nên **server phải chạy trên Render**. Có hai cách deploy:

### Cách 1: chỉ dùng Render (đơn giản nhất)

1. Đưa code lên GitHub.
2. Trên Render, chọn **New → Blueprint**, rồi chọn repo. File `render.yaml` sẽ tạo một web service.
3. Khi deploy xong, mở `https://<tên-service>.onrender.com` là chơi được ngay, vì server phục vụ luôn phần giao diện.

### Cách 2: Vercel cho giao diện, Render cho realtime

1. Deploy server lên Render như Cách 1 và ghi lại URL, ví dụ `https://in-a-grove.onrender.com`.
2. Trên Vercel, **Import** repo. Giữ Root Directory ở thư mục gốc, vì `vercel.json` đã cấu hình build `client/`.
3. Trong Vercel, vào **Settings → Environment Variables** và thêm:
   - `VITE_SERVER_URL` = URL Render ở bước 1.
4. Deploy lại Vercel.
5. (Tuỳ chọn) Trên Render, đặt `CLIENT_ORIGIN` = `https://<app>.vercel.app` để chỉ cho phép trang Vercel kết nối. Có thể liệt kê nhiều origin, ngăn cách bằng dấu phẩy.

### Lưu ý

- Gói Render miễn phí sẽ **ngủ** sau khoảng 15 phút không dùng. Lần vào đầu tiên có thể mất 30–60 giây.
- Phòng chơi được lưu **trong bộ nhớ**: khi server khởi động lại, các phòng đang chơi sẽ mất. Chỉ chạy **một instance**, vì nhiều instance sẽ cần Redis adapter cho Socket.IO.
- Phòng không còn ai kết nối sẽ bị xoá sau 30 phút.

## Cấu trúc

```
shared/   types + luật dùng chung (tìm hung thủ, số quân theo số người)
server/   Express + Socket.IO; src/room.ts là engine luật (có test)
client/   React + Vite + Framer Motion; src/art/ là hình SVG vẽ lại
images/   bộ hình in tự làm gốc (tham khảo thiết kế)
```

---

*In a Grove* do Jun Sasaki thiết kế và Oink Games phát hành. Đây là bản fan-made để chơi với bạn bè; nếu thích game, hãy ủng hộ bản chính thức.
