# ClimaSense (Next.js)

A weather dashboard built on the [WeatherAI API](https://weather-ai.co/docs) — current conditions, an AI-generated summary, and a 7-day forecast, with IP-based auto location and a live "instrument gauge" for temperature.

Built with Next.js 14 (App Router), React, and TypeScript. No separate backend — Next.js Route Handlers act as the API proxy.

**API docs used:** `GET /v1/weather`, `GET /v1/weather-geo`, `GET /v1/usage`

---

## Why it's built this way

The API key has to stay server-side — shipping it in client JS means anyone can open dev tools and steal it. Next.js makes this straightforward: anything under `app/api/**/route.ts` runs only on the server, and `process.env.WEATHERAI_API_KEY` (no `NEXT_PUBLIC_` prefix) is never bundled into client code.

`app/page.tsx` is a client component that only ever calls same-origin routes (`/api/weather`, `/api/geo`, `/api/usage`). Those routes proxy to WeatherAI and attach the real key, so the browser never sees it.

Each route also checks a small in-memory cache (5-minute TTL) before calling WeatherAI, since the Free tier caps out at 1,000 requests/month and repeated refreshes of the same location shouldn't burn quota. See [Scaling notes](#scaling-notes) for the real caveat with this approach on serverless hosts.

## Setup

**Requirements:** Node.js 18+

```bash
git clone <your-repo-url>
cd climasense-next
npm install
cp .env.example .env.local
```

Open `.env.local` and add your API key:

```
WEATHERAI_API_KEY=wai_your_key_here
```

Run it:

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Deploying

**Vercel** (built by the same team as Next.js, zero-config for this kind of app):

1. Push this repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → import the repo
3. Add an environment variable: `WEATHERAI_API_KEY = wai_your_key_here`
4. Deploy

**Render / Netlify** also both support Next.js directly:

- Build command: `npm run build`
- Start command: `npm start` (Render) — Netlify auto-detects Next.js and doesn't need this
- Add the same `WEATHERAI_API_KEY` env var in the host's dashboard

## Project structure

```
climasense-next/
├── app/
│   ├── layout.tsx          # root layout, fonts, metadata
│   ├── page.tsx            # dashboard UI (client component)
│   ├── globals.css         # design system (CSS variables, instrument-panel look)
│   └── api/
│       ├── weather/route.ts   # proxies GET /v1/weather
│       ├── geo/route.ts       # proxies GET /v1/weather-geo
│       └── usage/route.ts     # proxies GET /v1/usage
├── components/
│   ├── Gauge.tsx            # SVG temperature gauge
│   └── ForecastStrip.tsx    # 7-day forecast cards
├── lib/
│   ├── proxyWeatherAI.ts    # shared fetch + cache logic used by all 3 routes
│   └── types.ts             # response types — deliberately loose, see below
└── .env.example
```

## Known assumptions

The docs page shows a full example response for `/v1/trees/analyze` but not for `/v1/weather` — its field names aren't spelled out. `lib/types.ts` and `app/page.tsx` read fields defensively (`cur.temp ?? cur.temperature`, `weather.forecast ?? weather.daily`, etc.) so the UI degrades gracefully instead of breaking outright if a guessed field name is wrong. Once you have live API access, log one real response and trim the unused fallback paths — they're there to survive a first real request, not because the shape is actually ambiguous.

**A note on testing:** I built and reviewed this without network access to `api.weather-ai.co` or the npm registry, so I couldn't run `npm install` / `next dev` / `next build` against it end-to-end. I checked it carefully by hand (types, JSX, hook dependencies) and fixed a few real issues that way, but budget 15–20 minutes after your first `npm install` to catch anything a compiler would have.

## Scaling notes

- **Shared cache**: the in-memory cache in `lib/proxyWeatherAI.ts` lives inside each serverless function instance. On Vercel/Netlify that means cold starts reset it and concurrent instances don't share hits. Fine for a demo; swap in Redis (e.g. Upstash, which pairs naturally with Vercel) before this needs to hold up under real traffic.
- **Respect `X-RateLimit-Reset`**: a 429 currently just surfaces as an error message. It should be parsed and shown as "try again in Xm", with the frontend backing off automatically.
- **`ai=false` where it's not needed**: AI requests draw from a smaller, separate quota per the docs. A "just refresh the numbers" mode could skip `ai_summary` and only fetch it once per session.
- **Debounce geolocation on load**: `autoLocate()` fires one `/v1/weather-geo` call per page load. At scale, detecting once and caching the result client-side (or in a cookie) would cut that down.

## What I'd add next

- City name search (the API only accepts lat/lon, so this needs a separate geocoding step)
- Webhook-based alerts (rain/wind/frost) via `POST /v1/webhooks`, for a Pro-tier account
- Tests around the proxy's error handling (401/403/429 paths)
