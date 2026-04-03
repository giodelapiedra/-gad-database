# GAD Database

Gender and Development Records Management System for a Local Government Unit.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express + TypeScript + PostgreSQL + Prisma ORM

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL

### Setup

```bash
# Frontend
cd client
npm install
npm run dev

# Backend
cd server
npm install
npx prisma migrate dev
npm run dev
```

Frontend runs on `http://localhost:5173`
Backend runs on `http://localhost:3001`
