# Hybrid POS System

Hệ thống POS Hybrid cho mô hình kinh doanh "Lai" - Nhà hàng + Tạp hóa.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 15
- **Real-time:** Socket.IO
- **Offline:** PWA + IndexedDB

## Project Structure

```
hybrid-pos/
├── packages/
│   ├── backend/     # Express API + Socket.IO
│   ├── frontend/    # React POS + KDS + Dashboard
│   └── shared/      # Shared types & utilities
├── docs/            # Documentation
├── plans/           # Implementation plans
└── docker-compose.yml
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Run database migrations
pnpm db:migrate
```

## Documentation

- [BRIEF.md](./docs/BRIEF.md) - Project requirements
