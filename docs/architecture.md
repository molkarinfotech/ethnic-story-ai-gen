# Architecture Notes

## Frontend (Next.js App Router)
- `app/` - pages and API routes
- `components/layout/` - Header, Footer
- `components/shop/` - ProductCard, CartDrawer
- `lib/api.ts` - fetch helpers
- `styles/tokens.css` - design tokens

## Backend (Node.js)
- Standalone API server on port 4000
- Will be replaced by Next.js API routes or Express as features grow
- CORS configured for localhost:3000

## Database (Prisma)
- SQLite for local development
- Migrate to Postgres before production
- Models: User, Product, ProductImage, ProductVariant, Order, OrderItem

## Planned integrations
- Auth: Auth.js or Clerk
- Payments: Stripe or Razorpay
- Storage: Cloudflare R2 or Supabase Storage
- Hosting: Vercel (frontend) + Railway/Supabase (backend + DB)

## Milestones
1. Running Next.js frontend with static product data
2. Prisma DB connected with real product data
3. Customer auth
4. Cart and checkout
5. Payment integration
6. Admin dashboard
