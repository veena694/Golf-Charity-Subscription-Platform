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

### For Admin Login:
admin@gmail.com
admin@123

