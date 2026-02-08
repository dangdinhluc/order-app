# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Multi-language Support (Phase 1 & 2 & 3)**
    - Database: Added `languages` table and `name_translations`, `description_translations` JSONB columns to `products` and `categories`.
    - Backend: Added `LanguageController` and updated `ProductController`, `CategoryController` to handle translations.
    - Admin UI:
        - Created `ProductForm` with tabbed interface for multi-language input (VI, EN, JA).
        - Created `CategoryManager` and `CategoryForm` for managing categories with translations.
        - Refactored `MenuManager` to use new components and remove inline forms.
    - Customer View:
        - Updated `CustomerOrder` to support dynamic translations (VI, JA, EN).
        - Integrated language switcher with persistence (`localStorage`).
        - Localized all UI elements and error messages.
