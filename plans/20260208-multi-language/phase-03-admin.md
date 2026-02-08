# Phase 03: Admin UI

## Objective
Allow admins to manage languages and input translations for products.

## Requirements
- [ ] Settings page to manage Languages (Enable/Disable, Add new).
- [ ] Product Edit form: Add tabs/inputs for each active language.
- [ ] Category Edit form: Add tabs/inputs for translations.

## Implementation Steps
1. [ ] Create `LanguageSettings` page.
2. [ ] Update `ProductForm` component to support dynamic translation inputs.
3. [ ] Update `CategoryForm` component.

## Files to Create/Modify
- `packages/frontend/src/pages/admin/Settings/LanguageSettings.tsx`
- `packages/frontend/src/components/admin/ProductForm.tsx`

## Test Criteria
- [ ] Can add a new language (e.g., French).
- [ ] Can input French name for a product.
- [ ] Saving product persists translations.

---
Next Phase: [Phase 04: Customer UI](./phase-04-customer.md)
