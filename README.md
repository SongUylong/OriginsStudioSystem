# 🎬 Origins Studio Management System

An internal enterprise studio management system built with **Next.js**, **TypeScript**, **NextAuth**, and **Prisma** for managing studio workflows, assets, bookings, and operations.

---

## ✨ Features

- 🔐 **Authentication & RBAC:** Secure authentication using NextAuth.js with multi-role support.
- 📅 **Studio Booking & Scheduling:** Manage production calendar, equipment reservations, and studio slots.
- 👥 **Client & Project Management:** Track client projects, milestones, deliverables, and billing status.
- 📊 **Dashboard & Analytics:** Real-time metrics on studio occupancy, revenue, and active projects.

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Auth:** NextAuth.js
- **Styling:** Tailwind CSS, Radix UI / Shadcn
- **Database / ORM:** PostgreSQL / Prisma

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/SongUylong/OriginsStudioSystem.git
cd OriginsStudioSystem

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Run development server
npm run dev
```

---

## 👤 Author

**Song Uylong** ([@SongUylong](https://github.com/SongUylong))
