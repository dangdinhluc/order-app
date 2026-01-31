# Phase 01: Setup Environment
Status: ✅ Complete
Dependencies: None

## Objective
Cài đặt thư viện animation và cấu hình Dark Mode cho Tailwind CSS.

## Implementation Steps

### 1. [ ] Cài đặt Framer Motion
```bash
cd packages/frontend
pnpm add framer-motion
```

### 2. [ ] Cấu hình Dark Mode trong Tailwind
Sửa file `tailwind.config.js` (hoặc `index.css` nếu dùng Tailwind v4):
- Thêm `darkMode: 'class'`
- Định nghĩa màu dark theme (nền tối, text sáng)

### 3. [ ] Tạo file Component mới
Tạo file placeholder:
- `packages/frontend/src/pages/CustomerMenuV2.tsx`

## Files to Create/Modify
- `packages/frontend/package.json` - Add framer-motion
- `packages/frontend/src/index.css` - Dark theme variables
- `packages/frontend/src/pages/CustomerMenuV2.tsx` - New component

## Test Criteria
- [ ] `framer-motion` xuất hiện trong package.json
- [ ] Dark mode class hoạt động (test với class="dark")
- [ ] Import framer-motion không lỗi

---
Next Phase: [phase-02-database.md](./phase-02-database.md)
