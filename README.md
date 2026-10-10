# Sync

A safe way for parents to find help from nearby families. No feed, no likes, no comments, no public profiles.
AI protects children's details before anything is posted, and people make every decision.

**Track:** Parenting (with a line on AI keeping people in charge)

## Run it

```bash
npm install
npm run dev        # open http://localhost:3000
npm test           # 14 tests for the privacy guard and matching
```

It works with no keys at all. The privacy guard and matching are plain rules.

### Optional: add Gemini

1. Get a free key at https://aistudio.google.com/apikey
2. Copy `.env.example` to `.env.local` and paste the key after `GEMINI_API_KEY=`
3. Restart `npm run dev`

Gemini only ever sees text that the rules already cleaned, never the original post. If the key is missing, wrong, or rate limited, the app silently falls back to the rule based version. Use fake data only on the free tier.

## What works today

- Map and four boards (Help, Share, Gather, Street updates) from demo data
- Post page: write, safety check, safer version, approve, nearby matches with plain reasons
- "Still blocked / Cleared" buttons (counts live in the browser only)
- Trust badges: New, Invited by, Met N neighbors (display only)
- Safety page with honest wording

## What is NOT built yet (be honest about this in the pitch)

| Item | Notes |
|---|---|
| Logins | Use Supabase magic link. Email and phone are for login only, not a "verified" badge. |
| Saving posts | `supabase/schema.sql` is ready. Store only the cleaned, approved text. |
| Chat | In app only, contact details hidden. The guard should also run on chat messages. |
| Invite links and group codes | Powers the "Invited by" badge. |
| "We met" and tag reviews | Reviews unlock only after both people tap "We met", then reveal together. |
| Report button and admin page | Reports table exists in the schema. |
| Photos | Left out on purpose for version one. |
| Spanish toggle | Only if time is left. |

## Who owns what

**Owner (keys and core logic).** Do not edit without asking:
`lib/guard.ts`, `lib/matching.ts`, `lib/gemini.ts`, `app/api/*`, `app/post/page.tsx`, `.env*`, `supabase/schema.sql`

**Teammate (look, feel, and content).** Safe to change freely:
`app/globals.css`, `app/layout.tsx`, `app/safety/page.tsx` (ask before changing claims), `components/PostCard.tsx`, `components/Badge.tsx`, `data/demo.json`

Good teammate tasks:
- Make it look great on a phone (big buttons, readable text)
- Write 30 more risky sample posts in `data/guard-samples.md` with the safe version each should become. The owner runs them through the guard.
- Pitch slides, demo script, and a screen recording backup

Rules for everyone: private repo, work on your own branch, the owner reviews and merges, never commit `.env.local`, and ask before adding packages.

## Demo script (about 60 seconds)

1. Open the home page. Show the map and the boards. "No feed, no likes, no public profiles."
2. Go to Post. Paste: *Looking for a playdate for my 6 year old, Saturday morning, we live near Hudson Park, his name is Leo and he goes to Lincoln Elementary.*
3. Tap Check. The guard flags the child's name, the school, and the landmark, and explains why.
4. Approve the safer version. Show the nearby matches with plain reasons.
5. Go back to Street updates and tap "Still blocked." The count and time update.

## Pitch lines

- "Nextdoor is where neighbors argue. We are where neighbors help, and AI keeps kids' details safe."
- "We do not claim to verify anyone. We build trust in steps, and the final call is made in person."
- Say "automatic safety checks" for the rules, and "AI" only for the optional Gemini step.
