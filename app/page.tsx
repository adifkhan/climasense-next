import Dashboard from "@/components/Dashboard";
import { callWeatherAI } from "@/lib/weatherClient";
import { getClientIpFromHeaders } from "@/lib/getClientIp";
import type { WeatherResponse } from "@/lib/types";

const FALLBACK_COORDS = { lat: -1.2921, lon: 36.8219 }; // Nairobi

export default async function Page() {
  const clientIp = getClientIpFromHeaders();

  const geoParams = new URLSearchParams({
    ip: clientIp ?? "auto",
    days: "7",
    ai: "true",
  });
  const result = await callWeatherAI<WeatherResponse>(
    "/v1/weather-geo",
    geoParams,
  );

  const geoLabel = result.ok
    ? [
        result.geoHeaders?.city,
        result.geoHeaders?.region,
        result.geoHeaders?.country,
      ]
        .filter(Boolean)
        .join(", ") || undefined
    : undefined;

  return (
    <Dashboard
      initialLat={FALLBACK_COORDS.lat}
      initialLon={FALLBACK_COORDS.lon}
      initialWeather={result.ok ? result.data : null}
      initialGeoLabel={geoLabel}
      initialErrorMessage={result.ok ? null : result.error.message}
      initialRetryAfterSeconds={
        result.ok ? undefined : result.error.retryAfterSeconds
      }
    />
  );
}
