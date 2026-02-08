# Phase 04: Customer UI

## Objective
Implement language switcher and dynamic display on the Customer Menu.

## Requirements
- [ ] Global Language Context to store selected language.
- [ ] Language Switcher component (floating or in header).
- [ ] Update `ProductCard`, `CategoryList` to use `getProductName(item, lang)` helper.
- [ ] Smart Fallback: Show Vietnamese if translation missing.

## Implementation Steps
1. [ ] Create `LanguageContext.tsx`.
2. [ ] Create `LanguageSwitcher.tsx`.
3. [ ] Implement `useTranslation` hook or helper function.
4. [ ] Update Customer View components.

## Files to Create/Modify
- `packages/frontend/src/contexts/LanguageContext.tsx`
- `packages/frontend/src/components/common/LanguageSwitcher.tsx`
- `packages/frontend/src/utils/language.ts`

## Test Criteria
- [ ] Switching language updates product names immediately.
- [ ] Products without translation show Vietnamese.
- [ ] Cart and Order Summary reflect selected language.

---
Next Phase: [Phase 05: Testing](./phase-05-testing.md)
