# DJ Just Press Play — Developer Product Brief (Updated with Song Requests)

## Overview
DJ Just Press Play is a mobile-first live event web application for pubs and venues. Guests join via QR code, are auto-assigned to teams (Montagues vs Capulets), and participate in live music-based games controlled by the DJ.

This version includes **song requests in the MVP**, alongside live quiz gameplay.

---

## Core Features (MVP)

### Guest Experience
- Join via QR code
- Enter nickname
- Auto-assigned to team (balanced)
- Submit song requests
- Answer live quiz questions
- Earn points
- View leaderboard + team scores

### DJ Experience
- Start/end event
- View participants
- Launch quiz rounds
- Approve/reject song requests
- Send announcements

### Venue Screen
- Live question
- Countdown
- Team scores
- Leaderboard
- Approved requests (optional)

---

## Core Gameplay Loop

1. Song is playing
2. DJ launches question
3. Guests answer
4. System scores:
   - +1 participation
   - +5 correct
   - +5 fastest correct
5. Leaderboards update

---

## Song Requests (MVP Addition)

### Guest
- Submit song title + artist

### DJ
- Approve or reject requests

### Rules
- 1 request per user every 2–3 minutes
- Optional duplicate prevention

---

## Database Schema (Simplified)

### events
- id
- name
- venue_name
- event_code
- status

### teams
- id
- event_id
- name (Montagues / Capulets)
- short_code
- icon

### participants
- id
- event_id
- team_id
- nickname
- device_token
- points

### games
- id
- event_id
- round_number
- question_text
- status
- starts_at
- fastest_submission_id

### game_options
- id
- game_id
- option_text
- is_correct

### game_submissions
- id
- game_id
- participant_id
- selected_option_id
- is_correct
- response_ms
- points_awarded

### song_requests
- id
- event_id
- participant_id
- song_title
- artist_name
- status (pending, approved, rejected, played)

### announcements
- id
- event_id
- message

---

## API Endpoints

### POST /api/join-event
Creates participant + assigns team

### POST /api/submit-answer
Submits answer

### POST /api/song-request
Submits song request

---

## Technical Stack

- Next.js (frontend)
- Supabase (database + realtime + auth)
- Tailwind CSS

---

## Realtime Updates

Subscribe to:
- games
- participants
- announcements
- song_requests

---

## Future Features

- Streaks
- Board game mode (Claim the Square)
- Persistent teams
- Seasons
- Multi-venue broadcast
- Voting on song requests
- Spotify integration

---

## One-line Summary

A real-time interactive DJ game platform where pub guests join, request songs, compete in music quizzes, and contribute to team-based gameplay.
