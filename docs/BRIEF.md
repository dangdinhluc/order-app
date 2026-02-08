# 💡 BRIEF: Giao Diện Khách Hàng (Customer Experience 2.0)

**Ngày tạo:** 2026-01-29
**Brainstorm cùng:** Owner (Anh Chủ Quán)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Giao diện hiện tại còn đơn giản, chưa tạo cảm giác "thèm ăn" và sang trọng như các chuỗi nhà hàng lớn (Gogi, Haidilao, Sushi băng chuyền).
- Cần tối ưu trải nghiệm gọi món tại bàn, giảm tải cho nhân viên chạy bàn.

## 2. GIẢI PHÁP ĐỀ XUẤT
- Xây dựng giao diện gọi món mới (Visual-first Design) tập trung vào hình ảnh món ăn.
- Phong cách **Dark Mode** mặc định để làm nổi bật món ăn.
- Tích hợp các tính năng thông minh giúp tăng doanh thu (Combo, Best Seller) và vận hành (Smart Service Call).

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Primary:** Thực khách (Dùng trên điện thoại cá nhân hoặc iPad của quán).
- **Secondary:** Nhân viên phục vụ (Nhận thông báo gọi phục vụ chi tiết).

## 4. PHONG CÁCH THIẾT KẾ (UI/UX)
- **Màu chủ đạo:** Dark Theme (Nền tối, chữ trắng/vàng gold).
- **Bố cục:**
    - **Tablet/iPad:** 2 cột (Menu trái cố định - Lưới món phải).
    - **Mobile:** Thanh danh mục trượt ngang (Sticky) - Lưới món dọc.
- **Hiệu ứng:**
    - "Bay" món vào giỏ hàng khi chọn.
    - Rung nhẹ (Haptic feedback) khi tương tác.

## 5. TÍNH NĂNG CHÍNH (SCOPE)

### 🚀 MVP (Giai đoạn 1 - Làm ngay):
1.  **Menu Visual-first:**
    - Hiển thị hình ảnh kích thước lớn, tràn viền.
    - Nhãn nổi bật: "🔥 Best Seller", "👑 Chef's Choice".
2.  **Combo/Set View:**
    - Khu vực riêng hiển thị các combo.
    - Bấm vào xem chi tiết các món trong combo.
3.  **Smart Service Call (Gọi nhân viên 2.0):**
    - Menu gọi phục vụ với icon trực quan: "Thêm đá/nước", "Thay vỉ", "Lấy chén bát", "Thanh toán".
4.  **Tìm kiếm & Lọc:**
    - Lọc nhanh theo danh mục (Nướng, Lẩu, Nước...).
    - Tìm kiếm món theo tên.
5.  **Cart Animation:**
    - Hiệu ứng bay vào giỏ hàng vui mắt.

### 🎁 Nice-to-have (Giai đoạn 2):
- Gợi ý món ăn kèm ("Bạn có muốn gọi thêm Kimchi không?").
- Đánh giá món ăn sau khi thanh toán.
- Mini-game vòng quay may mắn trong lúc chờ món.

## 6. YÊU CẦU KỸ THUẬT SƠ BỘ
- **Frontend:** React + Tailwind CSS (Dark Mode config).
- **Animation:** Framer Motion.
- **Backend:** Tận dụng API `GET /api/customer/menu` hiện có (cần bổ sung field `is_best_seller`, `is_combo` vào DB).

## 7. CHIẾN LƯỢC DEPLOY: HYBRID MODEL (VPS + LOCAL)

### 💡 Ý tưởng:
Deploy app ở cả 2 nơi nhưng dùng chung 1 database (Neon DB).

- **VPS (Cloud):** Dùng cho khách hàng quét QR gọi món và chủ quán xem báo cáo từ xa.
- **Local (Máy tại quán):** Dùng cho nhân viên POS/Thu ngân/Bếp.
- **Database:** Dùng chung Neon DB để dữ liệu luôn đồng bộ.

### ✅ Ưu điểm:
- **Tốc độ:** Nhân viên tại quán load giao diện cực nhanh vì server nằm ngay trong mạng WiFi nội bộ.
- **Đồng bộ:** Khách đặt món trên Cloud, POS tại quán thấy ngay lập tức vì dùng chung DB.

### ⚠️ Thách thức:
- **Internet:** Nếu quán mất mạng, máy Local sẽ không gửi được dữ liệu lên Neon DB.
- **Cấu hình:** Cần quản lý cấu hình khác nhau cho bản Cloud và bản Local.

### 🖼️ Xử lý ảnh (Cloudinary)
Hiện tại dự án đang dùng **Cloudinary** để lưu ảnh, đây là phương án tối ưu nhất cho mô hình Hybrid:

- **Lưu trữ tập trung:** Ảnh không lưu ở ổ cứng máy chủ (VPS hay Local) mà lưu trên Cloud.
- **Tốc độ:** Cloudinary là CDN chuyên nghiệp, tự động tối ưu dung lượng ảnh giúp load cực nhanh dù khách ở quán hay ở xa.
- **Đồng bộ tự động:** Khi anh up ảnh từ máy ở quán, ảnh bay thẳng lên Cloudinary và đường dẫn (URL) được lưu vào Neon DB. Máy VPS sẽ thấy và hiển thị được ngay.

### 📶 Giải pháp khi Mất Mạng (Offline Resilience)
Đây là phần "sống còn" cho quán:

- **Cơ chế Lưu Tạm (Buffer):** Khi máy tại quán không thấy Internet, nó sẽ tự động chuyển sang chế độ "Chờ đồng bộ". Mọi đơn hàng nhân viên bấm trên iPad sẽ được lưu tạm vào ổ cứng máy tính Local.
- **In ấn nội bộ:** Vì máy in và iPad kết nối qua WiFi nội bộ, nên **mất mạng Internet anh vẫn in được hóa đơn và ticket bếp bình thường**.
- **Tự động đồng bộ:** Ngay khi có mạng trở lại, máy chủ Local sẽ tự động "đẩy" (sync) tất cả đơn hàng đã lưu tạm lên Neon DB cho anh.

### 🎯 Kết luận về mô hình Hybrid:
Đây là sự kết hợp hoàn hảo: **Dùng sướng như App Offline nhưng quản lý xịn như App Online.**

### 🔄 Đồng bộ thời gian thực (Neon Bridge)
Đây là câu trả lời cho lo lắng về việc khách quét QR và nhân viên tại bàn bị chồng chéo:

- **Dùng chung Database (Neon DB):** Mọi đơn hàng từ QR (qua VPS) và từ iPad (qua Local) đều bay về một chỗ duy nhất là Neon DB. Database sẽ là "trọng tài" duy nhất để cấp ID và quản lý trạng thái bàn.
- **Cơ chế thông báo tự động (Listen/Notify):** Khi có khách vừa đặt từ QR, Database sẽ tự động "gọi" cho máy chủ tại quán: *"Này, có đơn mới cho bàn số 5"*. 
- **Cập nhật tức thì (Socket.IO):** Ngay sau đó, máy chủ tại quán sẽ báo cho iPad của nhân viên rung lên và hiện món khách vừa gọi. 

### 🛡️ Xử lý xung đột khi mất mạng (Outage Conflict Resolution)
Trường hợp anh lo lắng: Quán mất mạng, khách đặt qua 4G (vào VPS) còn nhân viên đặt tại bàn (máy Local).

- **Cảnh báo mất đồng bộ:** Khi máy Local mất mạng, màn hình POS của nhân viên sẽ hiện cảnh báo đỏ: *"Mất kết nối Cloud - Cẩn thận kiểm tra đơn QR"*.
- **Cơ chế đối soát (Reconciliation):** Khi có mạng trở lại và máy Local bắt đầu đẩy đơn lên Neon DB, hệ thống sẽ tự động kiểm tra:
    - Nếu bàn đó cũng có đơn từ QR trong lúc mất mạng, hệ thống sẽ **không tự ý gộp** mà hiện lên một bảng thông báo cho nhân viên: *"Phát hiện đơn hàng trùng lặp tại Bàn 5"*.
    - Nhân viên chỉ cần nhấn nút **"Xác nhận gộp đơn"** hoặc **"Hủy đơn trùng"** là xong.

**=> Kết quả:** Dữ liệu vẫn an toàn và mọi sự chồng chéo đều được đưa ra cho con người quyết định cuối cùng, tránh việc hệ thống tự gộp sai món.

**=> Kết quả:** Nhân viên vẫn thấy khách gọi món dù khách đang kết nối với VPS ở tận Singapore, còn nhân viên đang kết nối với máy tính ở ngay tại quán.

## 8. BƯỚC TIẾP THEO
→ Thảo luận về phương án xử lý khi mất mạng (Offline support).
→ Chạy `/plan` để thiết kế hạ tầng này.
