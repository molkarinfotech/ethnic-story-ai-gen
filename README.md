# Ethnic Story - AI Generated E-commerce

Full-stack monorepo for an Indian ethnic clothing boutique.

## Stack
- **Frontend**: Next.js (App Router) + TypeScript
- **Backend**: Node.js API server
- **Database**: Prisma ORM + SQLite (dev) / Postgres (prod)
- **Payments**: Stripe / Razorpay (planned)
- **Auth**: Auth.js / Clerk (planned)

## Structure
```
frontend/   - Next.js app
backend/    - API server
shared/     - Shared TypeScript types
database/   - Prisma schema + seed
docs/       - Architecture notes
assets/     - Images and icons
```

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Database
```bash
cd database
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
```

## Roadmap
- [ ] Product listing and detail pages
- [ ] Customer authentication
- [ ] Cart and checkout
- [ ] Payment integration
- [ ] Admin dashboard
