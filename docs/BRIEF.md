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

## 7. BƯỚC TIẾP THEO
-> Chạy `/plan` để thiết kế Database Schema và Task List chi tiết.
