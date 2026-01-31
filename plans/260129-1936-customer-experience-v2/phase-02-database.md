# Phase 02: Database Schema
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Bổ sung cấu trúc database để hỗ trợ Combo, Best Seller badges, và Smart Service Call.

## Database Changes

### 1. [ ] Thêm cột vào bảng `products`
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_chef_choice BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;
```

### 2. [ ] Tạo bảng `combo_items` (Món trong combo)
```sql
CREATE TABLE IF NOT EXISTS combo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    included_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. [ ] Thêm loại service call mới vào bảng `service_calls`
Bảng `service_calls` đã có field `type`. Cần đảm bảo CHECK constraint cho phép các giá trị mới:
- 'water' (Thêm đá/nước)
- 'grill_change' (Thay vỉ nướng) - MỚI
- 'utensils' (Lấy chén bát) - MỚI
- 'bill' (Thanh toán)
- 'service' (Khác)

```sql
ALTER TABLE service_calls DROP CONSTRAINT IF EXISTS service_calls_type_check;
ALTER TABLE service_calls ADD CONSTRAINT service_calls_type_check 
    CHECK (type IN ('water', 'grill_change', 'utensils', 'bill', 'service', 'other'));
```

### 4. [ ] Tạo Migration File
Tạo file: `packages/backend/src/db/migrations/005_customer_experience_v2.sql`

## Files to Create/Modify
- `packages/backend/src/db/migrations/005_customer_experience_v2.sql` - [NEW]

## Test Criteria
- [ ] Migration chạy không lỗi: `pnpm db:migrate`
- [ ] Có thể query: `SELECT is_best_seller FROM products LIMIT 1;`
- [ ] Có thể insert combo_items

---
Next Phase: [phase-03-backend.md](./phase-03-backend.md)
