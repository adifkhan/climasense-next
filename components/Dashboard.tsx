"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import SearchControls from "./SearchControls";
import CurrentConditionsCard from "./CurrentConditionsCard";
import AISummaryCard from "./AISummaryCard";
import ForecastStrip from "./ForecastStrip";
import StatusBanner from "./StatusBanner";
import UsageFooter from "./UsageFooter";
import { deriveWeatherView } from "@/lib/deriveWeatherView";
import type { WeatherResponse, UsageResponse, Units, City } from "@/lib/types";

const PRESET_CITIES: City[] = [
  { name: "Nairobi", lat: -1.2921, lon: 36.8219 },
  { name: "Lagos", lat: 6.5244, lon: 3.3792 },
  { name: "London", lat: 51.5072, lon: -0.1276 },
  { name: "New York", lat: 40.7128, lon: -74.006 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
];

interface DashboardProps {
  initialLat: number;
  initialLon: number;
  initialWeather: WeatherResponse | null;
  initialGeoLabel?: string;
  initialErrorMessage: string | null;
  initialRetryAfterSeconds?: number;
}

export default function Dashboard({
  initialLat,
  initialLon,
  initialWeather,
  initialGeoLabel,
  initialErrorMessage,
  initialRetryAfterSeconds,
}: DashboardProps) {
  const [latInput, setLatInput] = useState(String(initialLat));
  const [lonInput, setLonInput] = useState(String(initialLon));

  const [units, setUnits] = useState<Units>("metric");
  const [weather, setWeather] = useState<WeatherResponse | null>(
    initialWeather,
  );

  const [geoLabel, setGeoLabel] = useState<string | undefined>(initialGeoLabel);
  const [loading, setLoading] = useState(false);
  const [cacheNote, setCacheNote] = useState("");
  const [usageText, setUsageText] = useState("Usage stats loading…");

  const [status, setStatus] = useState(initialErrorMessage ?? "");
  const [statusIsError, setStatusIsError] = useState(
    Boolean(initialErrorMessage),
  );
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<
    number | undefined
  >(initialRetryAfterSeconds);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setStatus("Fetching weather…");
    setStatusIsError(false);
    setRetryAfterSeconds(undefined);

    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        units: "metric",
        days: "7",
        ai: "true",
      });
      const res = await fetch(`/api/weather?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || `Request failed (HTTP ${res.status})`);
        setStatusIsError(true);
        setRetryAfterSeconds(data.retryAfterSeconds);
        return;
      }

      setWeather(data);
      setStatus("");
      setCacheNote(
        res.headers.get("X-Cache") === "HIT"
          ? "served from cache"
          : "fresh from WeatherAI",
      );
    } catch {
      setStatus("Network error — check your connection and try again.");
      setStatusIsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const autoLocate = useCallback(async () => {
    setLoading(true);
    setStatus("Detecting your location…");
    setStatusIsError(false);
    setRetryAfterSeconds(undefined);

    try {
      const res = await fetch("/api/geo?ip=auto");
      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Could not detect location");
        setStatusIsError(true);
        setRetryAfterSeconds(data.retryAfterSeconds);
        return;
      }

      const city = res.headers.get("X-City");
      const region = res.headers.get("X-Region");
      const country = res.headers.get("X-Country");
      const label = [city, region, country].filter(Boolean).join(", ");

      setGeoLabel(label || undefined);
      setWeather(data as WeatherResponse);
      setStatus("");
      setCacheNote(
        res.headers.get("X-Cache") === "HIT"
          ? "served from cache"
          : "fresh from WeatherAI",
      );
    } catch {
      setStatus(
        "Auto-detect unavailable — enter coordinates or pick a city below.",
      );
      setStatusIsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/usage");
        const data: UsageResponse = await res.json();
        if (!res.ok) throw new Error();
        const used = data.used;
        const limit = data.limit;
        setUsageText(
          used !== undefined && limit !== undefined
            ? `API usage: ${used} / ${limit} requests this period`
            : "API usage data unavailable",
        );
      } catch {
        setUsageText("API usage data unavailable");
      }
    })();
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
    setGeoLabel(undefined);
    fetchWeather(lat, lon);
  }

  function handleCityClick(lat: number, lon: number) {
    setLatInput(String(lat));
    setLonInput(String(lon));
    setGeoLabel(undefined);
    fetchWeather(lat, lon);
  }

  function handleUnitsChange(next: Units) {
    setUnits(next);
  }

  function handleRetry() {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) fetchWeather(lat, lon);
  }

  const unitLabel = units === "metric" ? "°C" : "°F";
  const parsedLat = parseFloat(latInput);
  const parsedLon = parseFloat(lonInput);

  const view = weather
    ? deriveWeatherView(
        weather,
        units,
        geoLabel,
        Number.isNaN(parsedLat) ? initialLat : parsedLat,
        Number.isNaN(parsedLon) ? initialLon : parsedLon,
      )
    : null;

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

      <SearchControls
        latInput={latInput}
        lonInput={lonInput}
        onLatChange={setLatInput}
        onLonChange={setLonInput}
        onSubmit={handleSubmit}
        onLocate={autoLocate}
        units={units}
        onUnitsChange={handleUnitsChange}
        cities={PRESET_CITIES}
        onCityClick={handleCityClick}
        disabled={loading}
      />

      <StatusBanner
        message={status}
        isError={statusIsError}
        retryAfterSeconds={retryAfterSeconds}
        onRetry={handleRetry}
      />

      {view && (
        <main className="results">
          <CurrentConditionsCard
            time={view.time}
            locationName={view.locationName}
            temp={view.temp}
            feelsLike={view.feelsLike}
            condition={view.condition}
            humidity={view.humidity}
            windSpeed={view.windSpeed}
            units={units}
          />
          <AISummaryCard summary={view.aiSummary} />
          <article className="forecast-card">
            <h3>7-Day Forecast</h3>
            <ForecastStrip days={view.forecastDays} unitLabel={unitLabel} />
          </article>
        </main>
      )}

      <UsageFooter usageText={usageText} cacheNote={cacheNote} />
    </div>
  );
}
