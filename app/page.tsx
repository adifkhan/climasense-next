"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Gauge from "@/components/Gauge";
import ForecastStrip from "@/components/ForecastStrip";
import type {
  WeatherResponse,
  GeoResponse,
  UsageResponse,
  ForecastDay,
  CurrentConditions,
} from "@/lib/types";

const PRESET_CITIES = [
  { name: "Nairobi", lat: -1.2921, lon: 36.8219 },
  { name: "Lagos", lat: 6.5244, lon: 3.3792 },
  { name: "London", lat: 51.5072, lon: -0.1276 },
  { name: "New York", lat: 40.7128, lon: -74.006 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
];

type Units = "metric" | "imperial";

export default function Home() {
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [units, setUnits] = useState<Units>("metric");
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [cacheNote, setCacheNote] = useState("");
  const [usageText, setUsageText] = useState("Usage stats loading…");

  const fetchWeather = useCallback(
    async (lat: number, lon: number, unitsOverride?: Units) => {
      const effectiveUnits = unitsOverride ?? units;
      setStatus("Fetching weather…");
      setStatusIsError(false);

      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
          units: effectiveUnits,
          days: "7",
          ai: "true",
        });
        const res = await fetch(`/api/weather?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        setWeather(data);
        setStatus("");
        setCacheNote(
          res.headers.get("X-Cache") === "HIT"
            ? "served from cache"
            : "fresh from WeatherAI",
        );
      } catch (err) {
        setWeather(null);
        setStatus(
          err instanceof Error
            ? err.message
            : "Something went wrong fetching weather data.",
        );
        setStatusIsError(true);
      }
    },
    [units],
  );

  const autoLocate = useCallback(async () => {
    setStatus("Detecting your location…");
    setStatusIsError(false);
    try {
      const res = await fetch("/api/geo?ip=auto");
      const data: GeoResponse = await res.json();
      if (!res.ok)
        throw new Error(
          (data as { error?: string }).error || "Could not detect location",
        );

      const lat = data.geo?.lat ?? data.lat;
      const lon = data.geo?.lon ?? data.lon;
      if (lat === undefined || lon === undefined)
        throw new Error("Location data missing from response");

      setLatInput(String(lat));
      setLonInput(String(lon));
      fetchWeather(lat, lon);
    } catch {
      setStatus(
        "Auto-detect unavailable — enter coordinates or pick a city below.",
      );
      setStatusIsError(true);
    }
  }, [fetchWeather]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/usage");
        const data: UsageResponse = await res.json();
        const used = data.requests ?? data.used ?? data.requestCount;
        const limit = data.limit ?? data.requestLimit;
        setUsageText(
          used !== undefined && limit !== undefined
            ? `API usage: ${used} / ${limit} requests this period`
            : "API usage data unavailable",
        );
      } catch {
        setUsageText("API usage data unavailable");
      }
    })();

    autoLocate();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setStatus("Enter valid numeric coordinates.");
      setStatusIsError(true);
      return;
    }
    fetchWeather(lat, lon);
  }

  function handleCityClick(lat: number, lon: number) {
    setLatInput(String(lat));
    setLonInput(String(lon));
    fetchWeather(lat, lon);
  }

  function handleUnitsChange(next: Units) {
    setUnits(next);
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) fetchWeather(lat, lon, next);
  }

  const unitLabel = units === "metric" ? "°C" : "°F";

  const cur = (weather?.current ?? weather ?? undefined) as
    | CurrentConditions
    | undefined;
  const temp = cur?.temp ?? cur?.temperature ?? 0;
  const feelsLike = cur?.feels_like ?? cur?.feelsLike ?? temp;
  const forecastDays: ForecastDay[] = weather?.forecast ?? weather?.daily ?? [];
  const locationName =
    weather?.location?.name ||
    (latInput && lonInput
      ? `${parseFloat(latInput).toFixed(2)}, ${parseFloat(lonInput).toFixed(2)}`
      : "—");

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">☀</span>
          <h1>ClimaSense</h1>
        </div>
        <p className="tagline">
          Live conditions and AI-generated forecasts, powered by the WeatherAI
          API
        </p>
      </header>

      <section className="controls">
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Latitude (e.g. -1.2921)"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            required
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Longitude (e.g. 36.8219)"
            value={lonInput}
            onChange={(e) => setLonInput(e.target.value)}
            required
          />
          <button type="submit">Get Weather</button>
        </form>

        <div className="quick-actions">
          <button className="ghost-btn" type="button" onClick={autoLocate}>
            📍 Use my location
          </button>
          <div className="city-chips">
            {PRESET_CITIES.map((city) => (
              <button
                key={city.name}
                className="chip"
                type="button"
                onClick={() => handleCityClick(city.lat, city.lon)}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>

        <div className="unit-toggle" role="group" aria-label="Units">
          <button
            type="button"
            className={`unit-btn ${units === "metric" ? "active" : ""}`}
            onClick={() => handleUnitsChange("metric")}
          >
            °C
          </button>
          <button
            type="button"
            className={`unit-btn ${units === "imperial" ? "active" : ""}`}
            onClick={() => handleUnitsChange("imperial")}
          >
            °F
          </button>
        </div>
      </section>

      <section
        className={`status-area ${statusIsError ? "error" : ""}`}
        aria-live="polite"
      >
        {status}
      </section>

      {weather && (
        <main className="results">
          <article className="current-card">
            <div className="current-main">
              <span className="eyebrow">
                READING{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <h2>{locationName}</h2>
              <div className="current-temp">
                <span>{Math.round(temp)}</span>
                <span
                  style={{
                    fontSize: 28,
                    marginLeft: 4,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 400,
                  }}
                >
                  {unitLabel}
                </span>
              </div>
              <p className="condition">
                {cur?.condition || cur?.summary || cur?.description || ""}
              </p>
            </div>

            <Gauge temp={temp} units={units} />

            <div className="current-meta">
              <div>
                <span className="meta-label">Feels like</span>
                <span>
                  {Math.round(feelsLike)}
                  {unitLabel}
                </span>
              </div>
              <div>
                <span className="meta-label">Humidity</span>
                <span>{cur?.humidity ?? "—"}%</span>
              </div>
              <div>
                <span className="meta-label">Wind</span>
                <span>
                  {cur?.wind_speed ?? cur?.windSpeed ?? "—"}{" "}
                  {units === "metric" ? "km/h" : "mph"}
                </span>
              </div>
            </div>
          </article>

          <article className="ai-card">
            <h3>AI Summary</h3>
            <p>
              {weather.ai_summary ||
                weather.summary ||
                "No AI summary available for this request."}
            </p>
          </article>

          <article className="forecast-card">
            <h3>7-Day Forecast</h3>
            <ForecastStrip days={forecastDays} unitLabel={unitLabel} />
          </article>
        </main>
      )}

      <footer className="app-footer">
        <span>{usageText}</span>
        <span className="cache-note">{cacheNote}</span>
      </footer>
    </div>
  );
}
