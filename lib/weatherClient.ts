import { describeUpstreamError, type ApiErrorInfo } from "./errors";
import type { GeoHeaders } from "./types";

const API_BASE = "https://api.weather-ai.co";

const cache = new Map<
  string,
  { data: unknown; geoHeaders?: GeoHeaders; time: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export type WeatherClientResult<T> =
  | { ok: true; data: T; cacheStatus: "HIT" | "MISS"; geoHeaders?: GeoHeaders }
  | { ok: false; error: ApiErrorInfo };

const MAX_RETRIES_ON_500 = 2;
const BASE_BACKOFF_MS = 300;

async function fetchWithRetry(
  url: string,
  apiKey: string,
  attempt = 0,
): Promise<Response> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (res.status === 500 && attempt < MAX_RETRIES_ON_500) {
    const delayMs = BASE_BACKOFF_MS * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fetchWithRetry(url, apiKey, attempt + 1);
  }

  return res;
}

function extractGeoHeaders(headers: Headers): GeoHeaders | undefined {
  const country = headers.get("x-country") ?? undefined;
  const region = headers.get("x-region") ?? undefined;
  const city = headers.get("x-city") ?? undefined;
  if (!country && !region && !city) return undefined;
  return { country, region, city };
}

export async function callWeatherAI<T = unknown>(
  upstreamPath: string,
  searchParams: URLSearchParams,
): Promise<WeatherClientResult<T>> {
  const cacheKey = `${upstreamPath}?${searchParams.toString()}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return {
      ok: true,
      data: cached.data as T,
      cacheStatus: "HIT",
      geoHeaders: cached.geoHeaders,
    };
  }

  const apiKey = process.env.WEATHERAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: {
        status: 500,
        message: "Missing WEATHERAI_API_KEY",
        retryable: false,
      },
    };
  }

  try {
    const qs = searchParams.toString();
    const url = `${API_BASE}${upstreamPath}${qs ? `?${qs}` : ""}`;
    const res = await fetchWithRetry(url, apiKey);
    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: describeUpstreamError(res.status, data, res.headers),
      };
    }

    const geoHeaders = extractGeoHeaders(res.headers);
    cache.set(cacheKey, { data, geoHeaders, time: Date.now() });
    return { ok: true, data: data as T, cacheStatus: "MISS", geoHeaders };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      ok: false,
      error: {
        status: 502,
        message: `Could not reach WeatherAI API: ${message}`,
        retryable: true,
      },
    };
  }
}
