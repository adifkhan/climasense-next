# ClimaSense (Next.js)

A weather dashboard built on the [WeatherAI API](https://weather-ai.co/docs) — current conditions, an AI-generated summary, and a 7-day forecast, with IP-based auto location and a live "instrument gauge" for temperature.

Built with Next.js 14 (App Router), React, and TypeScript.

**Live demo:** [click here](https://climasense-next.vercel.app/)
**API endpoints used:** `GET /v1/weather`, `GET /v1/weather-geo`, `GET /v1/usage`

---

## Architecture

### Server-rendered first paint

`app/page.tsx` is an **async Server Component** — it calls WeatherAI directly during server rendering (using the real visitor IP, see below) and hands the result to `components/Dashboard.tsx`, a client component that takes over for all interactivity after hydration.

This means the very first render already has real data in the HTML: no mount → `useEffect` → fetch → re-render waterfall, no loading spinner on first paint. Everything _after_ that first paint (search, city chips, unit toggle) still goes through the same-origin routes in `app/api/**`, exactly like before — the Server Component only optimizes the initial load.

Reading `headers()` (via `lib/getClientIp.ts`) makes this page dynamic automatically, which is correct: the response genuinely depends on the visitor's IP, so it shouldn't be statically cached.

### A real bug this surfaced: IP auto-detection was broken

`/v1/weather-geo?ip=auto` detects location from whoever is _making the HTTP request to WeatherAI_. Since the browser never calls WeatherAI directly (that would expose the API key), it's always **our own server** making that call — so a naive `ip=auto` forwarded straight from the client would have WeatherAI geolocate our hosting infrastructure, not the visitor.

Fix: `lib/getClientIp.ts` reads the real visitor IP from `x-forwarded-for` (set by Vercel, Render, Netlify, and virtually every reverse proxy) and the API routes pass that explicit IP instead of a bare `"auto"`.

### Component split

```
components/
├── Dashboard.tsx              # client component — owns all state/interactivity
├── SearchControls.tsx         # lat/lon form, locate button, city chips, unit toggle
├── CurrentConditionsCard.tsx  # presentational — temp, gauge, feels-like/humidity/wind
├── Gauge.tsx                  # SVG temperature dial
├── AISummaryCard.tsx          # presentational
├── ForecastStrip.tsx          # presentational — 7 forecast cards
├── StatusBanner.tsx           # error/status messages, rate-limit countdown, retry button
└── UsageFooter.tsx            # presentational
```

Everything except `Dashboard.tsx` is a small, presentational component that just renders props — easy to read in isolation, easy to reuse or test. `Dashboard.tsx` is the only place that owns fetch logic and state.

### A design change worth explaining: units are converted client-side, not re-fetched

Two things pushed this:

1. `/v1/weather-geo` doesn't accept a `units` param at all (only `ip`, `lat`, `lon`, `days`, `ai` — checked against the docs). So IP-detected weather is always metric regardless of what the user has selected, unless something converts it.
2. Free tier is capped at 1,000 requests/month. Re-fetching from WeatherAI every time someone flips the °C/°F toggle spends real quota on something that's just arithmetic.

So: **the app always requests metric from WeatherAI**, and `lib/unitConversion.ts` + `lib/deriveWeatherView.ts` convert to imperial for display. Toggling units is now instant and free — no network call, works identically whether the data came from a manual search or IP auto-detect. One caveat: the AI-generated summary _text_ is written in metric by WeatherAI and isn't re-translated — only the numeric fields are converted. That's noted right next to where it's rendered.

### Location labeling

`/v1/weather-geo`'s docs say it "returns weather + geo metadata in **response headers**" — `X-City` / `X-Region` / `X-Country` — not coordinates in the body. So:

- **IP auto-detect** → location label comes from those headers (`geoLabel` state in `Dashboard.tsx`)
- **Manual search / city chip** → location label falls back to formatted lat/lon (since we have real coordinates there)

`geoLabel` is cleared as soon as the user searches or picks a city, so the two labeling sources never fight each other.

### Error handling

`lib/errors.ts` maps WeatherAI's documented status codes to a consistent shape (`{ status, message, retryable, retryAfterSeconds? }`):

| Status | Handling                                                                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | Surfaced as-is — shouldn't happen since the frontend validates lat/lon first                                                                                   |
| 401    | Shown as a configuration issue, not something the user can act on                                                                                              |
| 403    | Plan-limitation message (e.g. a Free-tier key hitting a Pro+ endpoint)                                                                                         |
| 429    | `X-RateLimit-Reset` is parsed into a live countdown ("resets in 4m"), shown in `StatusBanner`                                                                  |
| 500    | `lib/weatherClient.ts` retries with exponential backoff (2 retries, 300ms/600ms) **before** this ever reaches the client — matches the docs' explicit guidance |
| 503    | Surfaced as "temporarily unavailable, try again shortly"                                                                                                       |

On any error, the UI **doesn't blank out existing data** — if you already have weather showing and a background refresh fails, you keep seeing the last known-good result underneath the error banner, with a Retry button.

## Setup

**Requirements:** Node.js 18+

```bash
git clone <your-repo-url>
cd climasense-next
npm install
cp .env.example .env.local
```

Add your key to `.env.local`:

```
WEATHERAI_API_KEY=wai_your_key_here
```

```bash
npm run dev
```

Visit `http://localhost:3000`. Note: on localhost there's no real `x-forwarded-for` header, so IP auto-detection will fall back to WeatherAI's own `ip=auto` behavior (which, in dev, means it'll detect wherever your dev machine's outbound connection appears to originate from) — this is expected and only matters once deployed behind a real proxy.

## Deploying

**Vercel** (built by the Next.js team, zero-config for this):

1. Push to GitHub, import at [vercel.com/new](https://vercel.com/new)
2. Add env var `WEATHERAI_API_KEY`
3. Deploy

**Render / Netlify** also support Next.js directly — build command `npm run build`, start command `npm start` (Render only; Netlify auto-detects), same env var.

## Project structure

```
climasense-next/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # Server Component — SSR initial fetch
│   ├── globals.css
│   └── api/
│       ├── weather/route.ts
│       ├── geo/route.ts      # forwards real visitor IP, strips unsupported `units`
│       └── usage/route.ts
├── components/                # see "Component split" above
├── lib/
│   ├── weatherClient.ts      # shared fetch + cache + retry-on-500, used by SSR and routes
│   ├── getClientIp.ts        # real visitor IP extraction
│   ├── errors.ts             # status-code → user-facing message mapping
│   ├── unitConversion.ts     # °C↔°F, km/h↔mph
│   ├── deriveWeatherView.ts  # normalizes the loose response shape + applies conversion
│   └── types.ts              # response types — deliberately loose, see below
└── .env.example
```

## Known assumptions

The docs show a full example response for `/v1/trees/analyze` but not for `/v1/weather` or `/v1/weather-geo` — field names for the actual weather payload aren't spelled out. `lib/types.ts` and `lib/deriveWeatherView.ts` read fields defensively (`cur.temp ?? cur.temperature`, etc.) so the UI degrades gracefully instead of breaking if a guessed field name is wrong. Once you have a real key, log one response and trim the unused fallback paths.

**A note on testing:** built and reviewed without network access to `api.weather-ai.co` or the npm registry — I couldn't run `npm install` / `next dev` against this end-to-end. I checked it carefully by hand (types, prop shapes, hook dependencies, every import against its export) and fixed several real issues that way. Budget 15–20 minutes after your first `npm install` to catch anything a compiler would.

## Scaling notes

- **Shared cache caveat**: `lib/weatherClient.ts`'s in-memory cache lives inside each serverless function instance — cold starts reset it, concurrent instances don't share hits. Fine for a demo; swap in Redis/Upstash before this needs to hold up under real traffic.
- **`ai=false` where it's not needed**: AI requests draw from a smaller, separate quota per the docs. A "just refresh the numbers" mode could skip `ai_summary`.
- **The units redesign above** is itself a quota-saving change — see that section.

## What I'd add next

- City name search (the API only accepts lat/lon or IP, so this needs a separate geocoding step)
- Webhook-based alerts (rain/wind/frost) via `POST /v1/webhooks`, for a Pro-tier account
- Tests around `lib/errors.ts` and `lib/deriveWeatherView.ts` — both are pure functions and cheap to unit test
