# Couride — Full Project Documentation
**Version:** 5.0 · **Date:** April 2026 · **Status:** Pilot Active

---

## What Is Couride?
Crowd-routed delivery and ride-sharing for Metro Vancouver.
Not Uber. Not a courier. A **coordination layer on top of trips already happening.**
People already driving Surrey ↔ North Shore carry packages and passengers along the way.

**Core positioning:** "Someone's already going your way."

---

## Project Structure

```
couride/
├── couride-app/
│   ├── index.html          ← Main web app (the thing at couride.co)
│   └── vercel.json         ← Routing config + security headers
│
├── smoke-test/
│   ├── send.html           ← Sender waitlist landing page (couride.co/send)
│   ├── drive.html          ← Driver waitlist landing page (couride.co/drive)
│   ├── ride.html           ← Passenger waitlist landing page (couride.co/ride)
│   └── admin.html          ← Analytics dashboard (couride.co/admin)
│
├── docs/
│   ├── README.md           ← This file
│   └── CLAUDE.md           ← Claude Code briefing (drop in repo root)
│
└── deploy.sh               ← One-command deploy script
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (single-file SPA) |
| Hosting | Vercel (project: paperplane-live-site → couride.co) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email, magic link, phone OTP, Google OAuth) |
| Realtime | Supabase Realtime (messages, matches, tracking) |
| CDN | jsDelivr (Supabase JS client) |
| Fonts | Google Fonts (Syne + DM Sans) |

---

## Deployment

### The Vercel Project
- **Vercel project name:** `paperplane-live-site` (old name — same project, just renamed internally)
- **Production domain:** `couride.co`
- **GitHub user:** `Aashwinrai2904`
- **Team:** Couride (Pro plan)

### How to Deploy
```bash
# Option 1: Push to GitHub (auto-deploys via Vercel git integration)
git add .
git commit -m "update"
git push

# Option 2: Use deploy.sh (requires Vercel CLI + login)
bash deploy.sh

# Option 3: Vercel CLI manually
vercel deploy --prod
```

### What Goes Where
All files in `couride-app/` and `smoke-test/` go into the **root** of your repo.
`vercel.json` handles the routing so `/send` serves `send.html`, etc.

---

## Supabase Configuration
- **Project ID:** `frwuvmjxjmnhucrkjwvn`
- **Region:** us-east-1
- **URL:** `https://frwuvmjxjmnhucrkjwvn.supabase.co`
- **Anon Key:** (in all HTML files — safe to expose, protected by RLS)

### Database Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profiles (auto-created on signup) | Auth users own their row |
| `traveler_routes` | Driver registered commute routes | Drivers own their routes |
| `ride_requests` | Passenger ride requests | Users own their requests |
| `sender_requests` | Parcel send requests | Users own their requests |
| `matches` | Driver ↔ requester matches | Participants only |
| `bookings` | Confirmed bookings + payment | Participants only |
| `messages` | In-match chat | Match participants only |
| `tracking_updates` | Live GPS from driver | Match participants only |
| `qr_tokens` | Pickup/dropoff verification codes | Match participants only |
| `smoke_test_signups` | Waitlist signups from smoke test | Public insert, auth read |
| `smoke_test_pageviews` | Page view tracking | Public insert, auth read |
| `rate_limits` | API rate limiting | Internal |

### Supabase Functions (SQL)
- `find_corridor_matches()` — matching engine, returns scored drivers for a request
- `calculate_corridor_price()` — pricing engine, returns Couride vs FedEx vs Purolator
- `generate_qr_tokens()` — creates pickup/dropoff QR codes for a match
- `verify_qr_token()` — validates a scanned QR code, updates match status
- `handle_new_user()` — trigger: auto-creates profile on auth signup

### Edge Functions (Deno)
- `smoke-test-notify` — logs new waitlist signups (console + future email)

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0d0f1a` | Page background (NEVER override) |
| `--surface` | `#13172b` | Cards, panels |
| `--surface2` | `#1a1f38` | Inputs, nested elements |
| `--border` | `#1f2440` | Dividers |
| `--accent` | `#C8FF00` | Primary CTA, highlights |
| `--orange` | `#FF6B35` | Driver segment |
| `--purple` | `#7B61FF` | Passenger segment |
| `--text` | `#f0f0f0` | Primary text |
| `--text2` | `#9aa3c8` | Secondary text |
| `--muted` | `#505880` | Placeholder, labels |
| Font Display | Syne 700/800 | Headings, buttons |
| Font Body | DM Sans 300/400/500 | Body text, inputs |

**Rule:** `color-scheme: dark` + `<meta name="color-scheme" content="dark">` on EVERY page.

---

## Auth Setup Status

| Provider | Status | How to Fix |
|----------|--------|-----------|
| Email/Password | ✅ Working | — |
| Magic Link (email OTP) | ✅ Working | — |
| Phone/SMS OTP | ⚠️ Needs Twilio | Supabase → Auth → Providers → Phone → Add Twilio creds |
| Google OAuth | ⚠️ Needs setup | See below |
| Apple | ❌ Remove | Requires $99/yr Apple Developer account |
| Facebook/Twitter | ❌ Remove | Not needed for pilot |

### Fix Google OAuth (5 min)
1. Go to: https://console.cloud.google.com
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)
3. Add Authorized Redirect URI: `https://frwuvmjxjmnhucrkjwvn.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. Go to: https://supabase.com/dashboard/project/frwuvmjxjmnhucrkjwvn/auth/providers
6. Google → Enable → Paste credentials → Save

---

## Smoke Test Pages

These are **separate from the main app.** Different purpose, different audience.

| Page | Segment | Ad targeting | Pass threshold |
|------|---------|-------------|---------------|
| `/send` | Package senders | Meta: Metro Van residents, online shoppers | >3% signup CVR |
| `/drive` | Drivers/commuters | Meta/FB: people who follow DoorDash driver pages | >3% signup CVR |
| `/ride` | Passengers | Meta: Metro Van, 22-45, ride-share interest | >3% signup CVR |
| `/admin` | You only | — | Requires Supabase auth login |

**UTM tracking:** Append `?utm_source=meta_ig` (or `fb_group`, `meta_fb`) to ad URLs.
The admin dashboard breaks down signups by source automatically.

**Budget:** ~$250 CAD total for 2 weeks = enough to reach decision point.

---

## Pilot Corridor

- **Route:** Surrey / Abbotsford ↔ North Shore via HWY 1 (~80km)
- **Schedule:** Weekdays only
- **Morning window:** 6:30–8:30 AM (outbound toward North Shore)
- **Afternoon window:** 2:30–5:30 PM (return toward Surrey/Abbotsford)
- **Stops:** Surrey Central, Guildford, Abbotsford, Langley, Burnaby HWY1 intercept, North Van, Lonsdale, Park Royal, Lynn Valley

---

## Known Bugs Fixed

| Bug | Fix Applied |
|-----|------------|
| White background in light mode | `color-scheme: dark` meta + CSS override |
| Google OAuth "nothing happens" | Added loading state + proper error message |
| Apple/FB/Twitter OAuth error | Removed from UI |
| RLS violations on 9 tables | Full policy set applied via migration |
| `handle_new_user` security hole | Revoked anon execute, fixed search_path |
| No autocomplete on address fields | Nominatim OSM + corridor stops fallback |
| Google Maps warning in console | Was from OLD live site, not new files |

---

## What's NOT Built Yet (Next Sprint)

- [ ] Real matching engine call from UI (function exists in DB, not wired to buttons yet)
- [ ] Stripe Connect payments
- [ ] Real SMS notifications (Twilio)
- [ ] Driver verification flow
- [ ] Push notifications
- [ ] CarryOn — React Native version

---

## Claude Code Setup
```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# In your repo root (after dropping CLAUDE.md here)
cd your-couride-repo
claude

# Claude Code will read CLAUDE.md and know everything about Couride
# Then you can say things like:
# "wire the submitRide() function to actually query Supabase"
# "add Stripe payment to the booking flow"
# "build the driver earnings dashboard"
```

---

## Vercel Team Access for Claude
The Vercel MCP currently connects to your personal account.
Your Couride project lives in the **Couride team** (Pro plan).
To give Claude MCP access to deploy:
1. Go to vercel.com → Team Settings → Tokens
2. Create a token with Couride team scope
3. Update the Vercel MCP connection in Claude settings with the new token

---

*Last updated: April 2026 · Built by Aashwin Rai*
