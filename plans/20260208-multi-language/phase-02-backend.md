# Phase 02: Backend API

## Objective
Expose language configuration and translation management APIs.

## Requirements
- [ ] API to list/add/update/delete languages.
- [ ] Update Product/Category APIs to handle translation fields.
- [ ] Ensure backward compatibility (always return `name` as `name_vi` if needed).

## Implementation Steps
1. [ ] Create `LanguageController` and routes.
2. [ ] Update `ProductController` to accept `name_translations`.
3. [ ] Update `CategoryController` to accept `name_translations`.

## Files to Create/Modify
- `packages/backend/src/controllers/LanguageController.ts`
- `packages/backend/src/routes/languages.ts`
- `packages/backend/src/index.ts` (register routes)

## Test Criteria
- [ ] `GET /api/languages` returns list.
- [ ] `POST /api/products` saves translations correctly.

---
Next Phase: [Phase 03: Admin UI](./phase-03-admin.md)
