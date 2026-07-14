import { NextResponse } from "next/server";

const API_BASE = "https://api.weather-ai.co";

const cache = new Map<string, { data: unknown; time: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function proxyWeatherAI(
  upstreamPath: string,
  searchParams: URLSearchParams,
) {
  const cacheKey = `${upstreamPath}?${searchParams.toString()}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, { headers: { "X-Cache": "HIT" } });
  }

  const apiKey = process.env.WEATHERAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Server is missing WEATHERAI_API_KEY. Set it in .env.local (dev) or your host's env vars (prod).",
      },
      { status: 500 },
    );
  }

  try {
    const qs = searchParams.toString();
    const upstreamUrl = `${API_BASE}${upstreamPath}${qs ? `?${qs}` : ""}`;
    const upstreamRes = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    const data = await upstreamRes.json();

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error:
            data?.error || data?.message || "Upstream WeatherAI request failed",
          status: upstreamRes.status,
        },
        { status: upstreamRes.status },
      );
    }

    cache.set(cacheKey, { data, time: Date.now() });

    const headers: Record<string, string> = { "X-Cache": "MISS" };
    const remaining = upstreamRes.headers.get("x-ratelimit-remaining");
    const reset = upstreamRes.headers.get("x-ratelimit-reset");
    if (remaining !== null) headers["X-RateLimit-Remaining"] = remaining;
    if (reset !== null) headers["X-RateLimit-Reset"] = reset;

    return NextResponse.json(data, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[climasense] Proxy error for ${upstreamPath}:`, message);
    return NextResponse.json(
      { error: "Could not reach WeatherAI API", detail: message },
      { status: 502 },
    );
  }
}
