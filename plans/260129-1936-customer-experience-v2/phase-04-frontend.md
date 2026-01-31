# Phase 04: Frontend UI
Status: ⬜ Pending
Dependencies: Phase 01 (can run parallel with Phase 03)

## Objective
Xây dựng giao diện khách hàng mới với Dark Mode, Visual-first design, và animations.

## Implementation Steps

### Layout & Theme (3 tasks)
1. [ ] **Dark Theme Base**
   - Tạo CSS variables cho dark theme
   - Nền: `#0f0f0f` (gần đen)
   - Text chính: `#ffffff`
   - Accent: `#fbbf24` (vàng gold)

2. [ ] **Responsive Layout**
   - Desktop/Tablet: 2 cột (Sidebar trái 280px, Content phải)
   - Mobile: 1 cột, Sticky category bar

3. [ ] **CategorySidebar Component**
   - Hiển thị danh mục với icon
   - Active state highlight
   - Scroll-to-section khi click

### Product Display (4 tasks)
4. [ ] **ProductCard Component (Dark)**
   - Ảnh tràn viền, bo góc
   - Badge "🔥 Best Seller" / "👑 Chef's Choice"
   - Giá nổi bật màu vàng gold
   - Hover effect subtle

5. [ ] **ComboCard Component**
   - Card lớn hơn ProductCard
   - Hiển thị danh sách món bên trong
   - Nút "Xem chi tiết" expand

6. [ ] **ProductGrid Component**
   - Grid 2 cột (mobile) / 3-4 cột (desktop)
   - Lazy loading images

7. [ ] **SearchBar Component**
   - Input với icon tìm kiếm
   - Filter chips theo danh mục
   - Debounce search

### Cart & Animation (3 tasks)
8. [ ] **CartButton (Floating)**
   - Nút giỏ hàng góc phải dưới
   - Badge hiển thị số lượng
   - Pulse animation khi có món mới

9. [ ] **Add-to-Cart Animation**
   - Framer Motion: Thumbnail bay vào CartButton
   - Haptic feedback (navigator.vibrate)

10. [ ] **CartDrawer Component**
    - Slide-in từ phải
    - Danh sách món đã chọn
    - Nút tăng/giảm số lượng
    - Nút "Gửi đơn"

### Service Call (2 tasks)
11. [ ] **ServiceCallModal**
    - Grid 2x2 các nút:
      - 🧊 Thêm đá/nước
      - 🔥 Thay vỉ nướng
      - 🥢 Lấy chén bát
      - 🧾 Thanh toán
    - Animation feedback khi gọi thành công

12. [ ] **Integrate vào CustomerMenuV2**
    - Floating button "Gọi nhân viên"
    - Mở modal khi click

## Files to Create/Modify
- `packages/frontend/src/pages/CustomerMenuV2.tsx` - Main page
- `packages/frontend/src/components/customer/CategorySidebar.tsx` - [NEW]
- `packages/frontend/src/components/customer/ProductCard.tsx` - [NEW]
- `packages/frontend/src/components/customer/ComboCard.tsx` - [NEW]
- `packages/frontend/src/components/customer/CartButton.tsx` - [NEW]
- `packages/frontend/src/components/customer/CartDrawer.tsx` - [NEW]
- `packages/frontend/src/components/customer/ServiceCallModal.tsx` - [NEW]
- `packages/frontend/src/components/customer/SearchBar.tsx` - [NEW]

## Design Reference
- Màu nền: `#0f0f0f`, `#1a1a1a`
- Màu text: `#ffffff`, `#a1a1aa`
- Màu accent: `#fbbf24` (gold), `#ef4444` (red for hot)
- Border radius: `12px` (cards), `24px` (buttons)
- Font: System default (tốc độ load)

## Test Criteria
- [ ] Dark mode hiển thị đúng trên mobile
- [ ] Animation add-to-cart hoạt động
- [ ] Service call modal mở/đóng đúng
- [ ] Grid responsive đúng breakpoints

---
Next Phase: [phase-05-integration.md](./phase-05-integration.md)
