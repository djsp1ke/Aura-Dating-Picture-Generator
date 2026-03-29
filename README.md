# DJ Just Press Play

A real-time interactive DJ game platform where pub guests join via QR code, request songs, compete in music quizzes, and contribute to team-based gameplay.

## Setup

**Prerequisites:** Node.js, a Supabase project

1. Install dependencies:
   ```
   npm install
   ```

2. Set up the database: Run `supabase-schema.sql` in your Supabase SQL Editor

3. Create `.env.local` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run the app:
   ```
   npm run dev
   ```

## How It Works

- **Guests** join via event code, get assigned to Montagues or Capulets, answer quiz questions, and request songs
- **DJ** creates events, launches quiz rounds, approves/rejects song requests, and sends announcements
- **Venue Screen** displays the live question, countdown timer, team scores, and leaderboard

## Tech Stack

- React + Vite + TypeScript
- Supabase (database + realtime)
- Tailwind CSS
