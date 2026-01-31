# Phase 06: Testing & Verification
Status: ⬜ Pending
Dependencies: Phase 05

## Objective
Kiểm tra toàn bộ flow và đảm bảo chất lượng trước khi release.

## Test Scenarios

### 1. [ ] Visual Testing (Browser)
**Steps:**
1. Chạy `pnpm dev` ở cả backend và frontend
2. Mở browser tại `http://localhost:5173/menu/<table_id>`
3. Kiểm tra:
   - Giao diện Dark Mode hiển thị đúng
   - Ảnh món ăn load đầy đủ
   - Badge Best Seller hiển thị
   - Animation add-to-cart hoạt động

### 2. [ ] Responsive Testing
**Steps:**
1. Mở DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Test với các kích thước:
   - iPhone SE (375px)
   - iPhone 14 (390px)
   - iPad (768px)
   - Desktop (1280px)
3. Kiểm tra:
   - Layout không bị vỡ
   - Text không bị cắt
   - Nút bấm đủ lớn để touch

### 3. [ ] Order Flow Testing
**Steps:**
1. Thêm 2-3 món vào giỏ
2. Mở CartDrawer, kiểm tra danh sách
3. Thay đổi số lượng
4. Bấm "Gửi đơn"
5. **Verify:** Đơn hàng xuất hiện trong Kitchen Dashboard

### 4. [ ] Service Call Testing
**Steps:**
1. Bấm nút "Gọi nhân viên"
2. Chọn "Thay vỉ nướng"
3. **Verify:** Thông báo xuất hiện trên màn hình POS/Kitchen

### 5. [ ] API Verification (curl)
```bash
# Test menu endpoint
curl http://localhost:3001/api/customer/menu/<table_id>
# Expected: JSON với is_best_seller, is_combo fields

# Test service call
curl -X POST http://localhost:3001/api/customer/call-service \
  -H "Content-Type: application/json" \
  -d '{"table_id":"<table_id>","type":"grill_change"}'
# Expected: {"success":true}
```

## Success Criteria
- [ ] Tất cả animations mượt (60fps)
- [ ] Order submit thành công
- [ ] Service call hoạt động với tất cả types
- [ ] Không có console errors
- [ ] Load time < 3 giây trên 4G

## Known Issues to Watch
- Hình ảnh lớn có thể load chậm → Cần lazy loading
- Haptic feedback chỉ hoạt động trên mobile có hỗ trợ
- Dark mode có thể conflict với branding settings từ CustomerSettings

---
✅ Hoàn thành Phase 06 = Feature Ready!
