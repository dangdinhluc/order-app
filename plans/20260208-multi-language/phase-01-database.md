# Phase 01: Setup & Database

## Objective
Create the database structure to support dynamic languages and translations.

## Requirements
- [ ] Create `languages` table (code, name, flag, is_active).
- [ ] Seed default languages (vi, en, ja, ko, zh).
- [ ] Add `name_translations` (JSONB) to `products` table.
- [ ] Add `description_translations` (JSONB) to `products` table.
- [ ] Add `name_translations` (JSONB) to `categories` table.

## Implementation Steps
1. [ ] Create migration file `032_multi_language_support.sql`.
2. [ ] Define schema for `languages` table.
3. [ ] Add JSONB columns to `products` and `categories`.
4. [ ] Run migration.

## Files to Create/Modify
- `packages/backend/src/db/migrations/032_multi_language_support.sql` - schema changes

## Test Criteria
- [ ] `languages` table exists with default data.
- [ ] `products` table has JSONB columns.
- [ ] Data insertion into JSONB columns works.

---
Next Phase: [Phase 02: Backend API](./phase-02-backend.md)
