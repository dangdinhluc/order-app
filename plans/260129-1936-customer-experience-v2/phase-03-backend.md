# Phase 03: Backend API
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Cập nhật API endpoint để trả về dữ liệu mới (badges, combos) và hỗ trợ Smart Service Call.

## Implementation Steps

### 1. [ ] Cập nhật `GET /api/customer/menu/:tableId`
Sửa file `packages/backend/src/routes/customer.ts`:
- Thêm `is_best_seller`, `is_chef_choice`, `is_combo` vào SELECT products
- Thêm logic lấy `combo_items` nếu product `is_combo = true`

### 2. [ ] Thêm endpoint `GET /api/customer/combos`
Trả về danh sách tất cả combo với chi tiết món bên trong:
```typescript
// Response format
{
  combos: [
    {
      id: "uuid",
      name: "Set Nướng 299k",
      price: 299000,
      image_url: "...",
      items: [
        { product_id: "...", name: "Thịt bò", quantity: 2 },
        { product_id: "...", name: "Rau", quantity: 1 }
      ]
    }
  ]
}
```

### 3. [ ] Cập nhật `POST /api/customer/call-service`
Sửa file `packages/backend/src/routes/customer.ts`:
- Cho phép `type` mới: 'grill_change', 'utensils'
- Emit socket event với icon tương ứng

### 4. [ ] Thêm endpoint Admin: `PUT /api/products/:id/badges`
Cho phép Admin đánh dấu món là Best Seller / Chef's Choice:
```typescript
// PUT /api/products/:id/badges
{ is_best_seller: true, is_chef_choice: false }
```

### 5. [ ] Thêm endpoint Admin: `POST /api/combos`
Cho phép Admin tạo combo mới với các món bên trong.

## Files to Create/Modify
- `packages/backend/src/routes/customer.ts` - Update menu, service call
- `packages/backend/src/routes/products.ts` - Add badges endpoint
- `packages/backend/src/routes/combos.ts` - [NEW] Combo management

## Test Criteria
- [ ] `GET /api/customer/menu/:tableId` trả về `is_best_seller` field
- [ ] `POST /api/customer/call-service` với `type: grill_change` thành công
- [ ] `GET /api/customer/combos` trả về danh sách combo

---
Next Phase: [phase-04-frontend.md](./phase-04-frontend.md)
