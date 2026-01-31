# Phase 05: Integration
Status: ⬜ Pending
Dependencies: Phase 03 + Phase 04

## Objective
Kết nối Frontend với Backend API và đảm bảo flow hoàn chỉnh.

## Implementation Steps

### 1. [ ] Kết nối CustomerMenuV2 với API
- Fetch menu từ `GET /api/customer/menu/:tableId`
- Fetch combos từ `GET /api/customer/combos`
- Xử lý loading states

### 2. [ ] Kết nối Cart với Order API
- Submit order qua `POST /api/customer/order`
- Hiển thị success/error message
- Clear cart sau khi submit thành công

### 3. [ ] Kết nối Service Call
- Gọi `POST /api/customer/call-service` với type tương ứng
- Hiển thị animation "Đã gọi nhân viên"

### 4. [ ] Thêm route mới vào App.tsx
- Route `/menu/:tableId` → CustomerMenuV2
- (Giữ route cũ `/customer/:tableId` → CustomerMenu cho fallback)

## Files to Create/Modify
- `packages/frontend/src/pages/CustomerMenuV2.tsx` - Connect API
- `packages/frontend/src/App.tsx` - Add route

## Test Criteria
- [ ] Data từ API hiển thị đúng trên UI
- [ ] Submit order thành công và hiện trong Kitchen
- [ ] Service call gửi socket event thành công

---
Next Phase: [phase-06-testing.md](./phase-06-testing.md)
