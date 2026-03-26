## Deployment

This repository is ready for a split deployment:

- `client/` -> Vercel
- `server/` -> Render

That is the cleanest path for the current architecture because the frontend is a Vite SPA and the backend is a long-running Express server.

### 1. Deploy the API on Render

Use the included [`render.yaml`](/d:/golf-system/render.yaml) or create the service manually.

Settings:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLIENT_URL`

Recommended:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `EMAIL_FROM`

Use [`server/.env.example`](/d:/golf-system/server/.env.example) as the source of truth.

### 2. Deploy the frontend on Vercel

Import the repo into Vercel and set the project root directory to `client`.

The included [`client/vercel.json`](/d:/golf-system/client/vercel.json) configures:

- Vite build command
- `dist` output directory
- SPA rewrites back to `index.html`

Required frontend environment variables:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLIC_KEY`

Use [`client/.env.example`](/d:/golf-system/client/.env.example).

### 3. Connect frontend and backend

After Render gives you a backend URL:

1. Set `VITE_API_URL` in Vercel to the Render backend URL.
2. Set `CLIENT_URL` in Render to the Vercel frontend URL.
3. Redeploy both services.

### 4. Configure Stripe

In Stripe:

1. Set your frontend domain in checkout success/cancel expectations through env vars already used by the app.
2. Create a webhook pointing to:

`https://your-render-domain.onrender.com/api/stripe/webhook`

3. Subscribe at minimum to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 5. Configure Supabase

Ensure your production Supabase project contains the tables used by the app:

- `users`
- `subscriptions`
- `golf_scores`
- `charities`
- `draws`
- `draw_results`
- `draw_winners`
- `winner_verifications`
- `payouts`

Optional but recommended if you want donation logging:

- `donations`

### 6. Production checklist

- Rotate any test or exposed secrets before going live.
- Replace test Stripe keys with live keys.
- Update `ADMIN_EMAIL` and `ADMIN_PASSWORD` to production-safe values.
- Add SMTP credentials if you want real email delivery.
- Verify CORS by checking `CLIENT_URL` on the API matches the deployed frontend domain.
