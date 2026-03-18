# EJUST Club Hub

A full-stack web application for Egypt-Japan University of Science and Technology students to discover and join clubs, attend events, and communicate with club members.

## Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query
- **Icons**: Lucide React

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Enable Email Auth in **Authentication > Providers**
4. Copy your project URL and anon key from **Project Settings > API**

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Create a Platform Admin

After running the schema, manually insert a platform admin user:

1. Register a user through the app
2. In Supabase Table Editor, find the user in the `users` table
3. Update their `role` to `platform_admin`

### 5. Run the dev server

```bash
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── layout/          # Navbar, Layout wrapper
│   ├── shared/          # ProtectedRoute, ClubCard
│   └── ui/              # Reusable UI primitives
├── context/
│   ├── AuthContext.tsx  # Auth state management
│   └── ToastContext.tsx # Toast notifications
├── hooks/
│   └── useDarkMode.ts   # System dark mode detection
├── lib/
│   └── supabase.ts      # Supabase client
├── pages/
│   ├── auth/            # Login, Register, Club Admin Register
│   ├── student/         # Dashboard, Clubs, Events, Messages...
│   ├── clubadmin/       # Admin dashboard and sub-pages
│   └── platformadmin/   # Platform management pages
├── types/               # TypeScript type definitions
├── App.tsx              # Root component
└── AppRouter.tsx        # Route configuration
```

## User Roles

| Role | Access | Registration |
|------|--------|-------------|
| `student` | Student dashboard, clubs, events | `/register` (requires @ejust.edu.eg email) |
| `club_admin` | Club management dashboard | `/register/club-admin` (requires approval) |
| `platform_admin` | Full platform oversight | Manually assigned in DB |

## Design System

- **Primary Color**: E-JUST Red `#C0121F`
- **Fonts**: DM Serif Display (headings) + Outfit (body)
- **Theme**: Minimal monochrome with red accents
- **Dark Mode**: System preference detection + toggle
