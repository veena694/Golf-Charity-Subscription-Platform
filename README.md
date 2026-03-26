# GolfFlow - Golf Performance Tracking with Charity Impact

A modern, subscription-driven web application combining golf score tracking, monthly draw-based prizes, and charitable fundraising. Built with React, TypeScript, Supabase, and Stripe.

## Overview

GolfFlow allows golfers to:
- **Track** their latest 5 golf scores in Stableford format
- **Win** monthly prize draws based on score matching
- **Give** a portion of their subscription to charities they care about

The platform is designed to feel emotionally engaging and modern—deliberately avoiding traditional golf industry aesthetics.

## Features Implemented

### 🎯 User-Facing Features

#### Authentication
- ✅ Email/password signup and login
- ✅ User profile management
- ✅ Session-based authentication

#### Subscription System
- ✅ Monthly plan (£29.99/month)
- ✅ Yearly plan (£299.99/year) - 17% savings
- ✅ Stripe payment integration
- ✅ Subscription status tracking

#### Golf Score Tracking
- ✅ Entry of Stableford scores (1-45)
- ✅ Last 5 scores management (newest replaces oldest automatically)
- ✅ Score history with dates and optional course names
- ✅ Automatic reverse chronological ordering

#### Charity Integration
- ✅ Browse all available charities
- ✅ Search and filter functionality
- ✅ Select primary charity
- ✅ Set custom contribution percentage (minimum 10%)
- ✅ View contribution breakdown in dashboard

#### User Dashboard
- ✅ Subscription status and details
- ✅ Latest scores display
- ✅ Charity selection interface
- ✅ Winnings overview
- ✅ Account settings

#### Draw System
- ✅ Random draw generation
- ✅ Algorithmic draws based on score frequency
- ✅ Prize pool calculation (40% 5-match, 35% 4-match, 25% 3-match)
- ✅ Draw number generation
- ✅ Winner matching logic
- ✅ Draw status tracking (pending, published, completed)

### 👨‍💼 Admin Features

#### Admin Dashboard
- ✅ User management view
- ✅ Subscription statistics
- ✅ Draw management interface
- ✅ Winner verification system
- ✅ Payout tracking

#### Draw Management
- ✅ Create new draws
- ✅ Configure draw parameters
- ✅ Choose random or algorithmic method
- ✅ Publish draws
- ✅ View draw history

#### Winner Management
- ✅ View all winners
- ✅ Verify winner submissions
- ✅ Track payout status
- ✅ Mark payouts as completed

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS 3** - Styling
- **Radix UI** - Component library
- **React Router 6** - Client-side routing
- **Lucide React** - Icons
- **TanStack Query** - Data fetching
- **Date-fns** - Date utilities

### Backend
- **Express.js** - API server
- **Node.js 22** - Runtime

### Database & Services
- **Supabase** - PostgreSQL database with RLS
- **Stripe** - Payment processing

## Project Structure

```
golfflow/
├── client/                          # React frontend
│   ├── pages/                       # Route components
│   │   ├── Index.tsx               # Homepage
│   │   ├── Login.tsx               # Login page
│   │   ├── Signup.tsx              # Sign up page
│   │   ├── Subscribe.tsx           # Subscription page
│   │   ├── Dashboard.tsx           # User dashboard
│   │   ├── Charities.tsx           # Charity directory
│   │   ├── Admin.tsx               # Admin main panel
│   │   ├── AdminDraws.tsx          # Draw management
│   │   ├── AdminWinners.tsx        # Winner verification
│   │   └── PlaceholderPage.tsx     # Placeholder for future pages
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth state management
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client & helpers
│   │   ├── drawEngine.ts          # Draw logic & calculations
│   ├── components/ui/              # Shadcn UI components
│   ├── hooks/                      # React hooks
│   ├── App.tsx                    # Main app component
│   ├── global.css                 # Global styles & theme
│
├── server/                         # Express backend
│   ├── routes/
│   │   ├── stripe.ts             # Stripe checkout endpoints
│   │   ├── draws.ts              # Draw management endpoints
│   │   └── demo.ts               # Example endpoint
│   └── index.ts                  # Main server setup
│
├── shared/                         # Shared types
│   └── api.ts                     # API interfaces
│
├── supabase/
│   └── schema.sql                 # Database schema
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts                # Frontend config
├── vite.config.server.ts         # Server config
└── SETUP.md                       # Setup instructions
```

## Database Schema

### Core Tables
- **users** - User accounts, roles, subscription details
- **golf_scores** - Score entries (max 5 per user)
- **subscriptions** - Stripe subscription tracking
- **charities** - Charitable organizations

### Draw System
- **draws** - Monthly draws with numbers and status
- **draw_results** - Results for each match type
- **draw_winners** - Winners and their winning numbers
- **winner_verifications** - Proof verification tracking
- **payouts** - Payout status and tracking

### Supporting
- **charity_contributions** - Track contribution history

## API Endpoints

### Authentication
- Managed by Supabase Auth

### Payments
- `POST /api/create-checkout-session` - Create Stripe checkout
- `GET /api/checkout-success` - Verify checkout success

### Draws
- `POST /api/draws/create` - Create new draw
- `POST /api/draws/publish` - Publish draw results
- `GET /api/draws` - Fetch draw history

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://pehkarrnudlviglmzwqs.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## Getting Started Locally

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## Deployment

### Prerequisites
- Supabase project created (schema imported from `supabase/schema.sql`)
- Stripe account configured
- Vercel account ready

### Deployment Steps

1. **Push to GitHub** and connect to Vercel
2. **Set Environment Variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

### Post-Deployment Setup

1. **Supabase**
   - Import schema from `supabase/schema.sql`
   - Configure RLS policies
   - Add sample charities

2. **Stripe**
   - Set up webhooks for `checkout.session.completed`
   - Configure webhook endpoint at `/api/webhooks/stripe`

3. **Email** (Optional)
   - Configure SendGrid or similar for notifications

## Testing

### User Flows to Test
- [ ] User signup with email validation
- [ ] User login and logout
- [ ] Subscription with Stripe (use test cards: 4242 4242 4242 4242)
- [ ] Golf score entry (1-45 range validation)
- [ ] Last 5 scores rolling logic
- [ ] Charity selection and viewing
- [ ] Dashboard displays all information
- [ ] Admin dashboard access (admin-only)
- [ ] Draw creation and publishing
- [ ] Winner verification workflow
- [ ] Payout tracking
- [ ] Responsive design (mobile, tablet, desktop)

## Future Enhancements

### Phase 2
- [ ] Email notifications (draw results, winner alerts)
- [ ] Advanced analytics dashboard
- [ ] Charity contribution reports
- [ ] Winner proof upload interface
- [ ] Team/corporate account support

### Phase 3
- [ ] Mobile app (React Native)
- [ ] Payment method management
- [ ] Subscription modification (upgrade/downgrade)
- [ ] Referral program
- [ ] Leaderboards

### Phase 4
- [ ] Multiple currency support
- [ ] Multi-language support
- [ ] API for third-party integrations
- [ ] White-label solution

## Design Philosophy

### Emotional Design
- Focus on charitable impact, not competition
- Warm, modern color palette
- Smooth animations and transitions
- Clear value communication

### Modern Aesthetics
- No traditional golf clichés (fairways, plaid, clubs)
- Clean, minimalist interface
- Mobile-first responsive design
- Fast, optimized performance

## Color Palette

- **Primary (Teal)**: #10B981 - Growth, nature, trust
- **Secondary (Coral)**: #FB7E5D - Warmth, welcome
- **Charity (Gold)**: #F59E0B - Impact, warmth
- **Background**: Off-white - Professional, clean

## Performance Optimization

- Vite for fast builds
- Code splitting and lazy loading
- Optimized images and assets
- Database indexing on frequently queried fields
- RLS policies for secure data access

## Security

- Row Level Security (RLS) on all database tables
- JWT-based authentication via Supabase
- Environment variables for sensitive keys
- HTTPS enforced in production
- SQL injection prevention via parameterized queries
- XSS protection via React's automatic escaping

## Troubleshooting

### Common Issues

**Connection to Supabase fails**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Check Supabase project is active
- Ensure RLS policies are configured

**Stripe errors**
- Verify Stripe keys are in test mode
- Check VITE_ prefix for client-side keys
- Ensure webhook endpoint is configured

**Auth issues**
- Clear browser cookies and cache
- Check Supabase Auth settings
- Verify user profile exists in `users` table

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Express.js**: https://expressjs.com

## License

Proprietary - GolfFlow Platform

## Contact

For support and inquiries, please contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready
