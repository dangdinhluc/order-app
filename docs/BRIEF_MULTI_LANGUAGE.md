# 💡 BRIEF: Dynamic Multi-language Menu

**Ngày tạo:** 2026-02-08
**Tính năng:** Hiển thị và quản lý đa ngôn ngữ động (Dynamic Multi-language)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Hiện tại hệ thống chỉ hỗ trợ cứng một vài ngôn ngữ (Việt, Anh, Nhật) thông qua các cột riêng lẻ.
- Khách quốc tế (Hàn, Trung, Thái...) khó gọi món nếu không có tiếng của họ.
- Việc thêm ngôn ngữ mới cần can thiệp code (sửa database, sửa frontend).

## 2. GIẢI PHÁP ĐỀ XUẤT
Xây dựng hệ thống **Đa ngôn ngữ động (Dynamic Language System)**:
- **Admin:** Có thể tự thêm/bớt ngôn ngữ bất kỳ (VD: Thêm tiếng Hàn, tiếng Trung).
- **Sản phẩm:** Nhập tên món ăn theo các ngôn ngữ đang kích hoạt.
- **Khách hàng:** Chọn ngôn ngữ hiển thị trên iPad/Điện thoại.
- **Nhân viên/Bếp:** Luôn hiển thị Tiếng Việt (hoặc ngôn ngữ hệ thống mặc định) để tránh nhầm lẫn.

## 3. TÍNH NĂNG CHI TIẾT

### 🚀 Admin Portal (Quản lý)
1. **Quản lý Ngôn ngữ (Language Settings):**
   - Danh sách ngôn ngữ: Thêm mới, Bật/Tắt.
   - Mỗi ngôn ngữ có: Tên hiển thị (VD: English), Mã (en), Icon cờ.
   - **Lưu ý:** Tiếng Việt (`vi`) là mặc định, không thể tắt/xóa.

2. **Quản lý Món ăn (Product Editing):**
   - Giữ nguyên tên gốc Tiếng Việt (`name_vi`).
   - Các ngôn ngữ khác nhập vào danh sách động (VD: Tiếng Anh, Tiếng Nhật, Tiếng Hàn...).
   - Nếu để trống ngôn ngữ phụ -> Tự động dùng Tiếng Việt khi hiển thị (Fallback).

### 📱 Customer View (Khách gọi món)
1. **Bộ chuyển đổi ngôn ngữ (Language Switcher):**
   - Nút chọn ngôn ngữ nổi bật ở màn hình Chào mừng hoặc Menu.
   - Hiển thị cờ và tên ngôn ngữ.
   
2. **Hiển thị món ăn:**
   - Tên món thay đổi theo ngôn ngữ khách chọn.
   - Nếu món đó chưa được dịch -> Hiển thị Tiếng Việt.
   - Mô tả món (description) cũng thay đổi tương ứng.

### 👩🍳 Staff/Kitchen View (Nhân viên)
- **Luôn hiển thị Tiếng Việt** trên phiếu bếp, màn hình POS, và hóa đơn in cho quán.
- Hóa đơn in cho khách có thể hiển thị song ngữ (Việt + Ngôn ngữ khách chọn) - *Optional*.

## 4. YÊU CẦU KỸ THUẬT SƠ BỘ
- **Database:**
  - Bảng `languages`: Lưu cấu hình ngôn ngữ.
  - Cột `translations` (JSONB) trong bảng `products`: Lưu tên/mô tả theo mã ngôn ngữ (VD: `{"en": "Beef Noodle", "ko": "..."}`).
- **Frontend:**
  - Context/Store để quản lý `currentLanguage`.
  - Helper function `getProductName(product, lang)` để xử lý logic fallback.

## 5. TIẾN ĐỘ THỰC HIỆN
- [x] **Phase 1: Database**: Tạo bảng languages, migrate schema.
- [x] **Phase 2: Backend API**: API CRUD Languages, cập nhật Products/Categories API.
- [x] **Phase 3: Admin UI**: Refactor MenuManager, thêm ProductForm/CategoryForm đa ngôn ngữ.
- [ ] **Phase 4: Customer View**: Cập nhật iPad/QR Menu để chuyển đổi ngôn ngữ.

## 6. BƯỚC TIẾP THEO
→ Triển khai **Phase 4: Customer View** (Language Switcher & Display Logic).
