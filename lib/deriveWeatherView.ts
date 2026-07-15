import type {
  WeatherResponse,
  CurrentConditions,
  ForecastDay,
  Units,
} from "./types";
import { celsiusToFahrenheit, kmhToMph } from "./unitConversion";

export interface ForecastDayView {
  date?: string;
  day?: string;
  high: number;
  low: number;
}

export interface WeatherView {
  time: string;
  locationName: string;
  temp: number;
  feelsLike: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  aiSummary: string;
  forecastDays: ForecastDayView[];
}

function convertTemp(celsius: number, units: Units): number {
  return units === "imperial" ? celsiusToFahrenheit(celsius) : celsius;
}

function convertWind(
  kmh: number | undefined,
  units: Units,
): number | undefined {
  if (kmh === undefined) return undefined;
  return units === "imperial" ? kmhToMph(kmh) : kmh;
}

export function deriveWeatherView(
  weather: WeatherResponse,
  units: Units,
  locationOverride: string | undefined,
  fallbackLat: number,
  fallbackLon: number,
): WeatherView {
  const cur = (weather.current ?? weather) as CurrentConditions | undefined;
  const tempCelsius = cur?.temperature ?? 0;
  const feelsLikeCelsius = tempCelsius;
  const windKmh = cur?.windspeed;

  const rawForecastDays: ForecastDay[] =
    weather.forecast ?? weather.daily ?? [];
  const forecastDays: ForecastDayView[] = rawForecastDays.map((d) => ({
    date: d.date,
    day: d.day,
    high: convertTemp(d.temp_max ?? d.max ?? d.high ?? 0, units),
    low: convertTemp(d.temp_min ?? d.min ?? d.low ?? 0, units),
  }));

  return {
    time: new Date(cur?.time || new Date()).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    locationName:
      locationOverride ||
      weather.location?.name ||
      `${fallbackLat.toFixed(2)}, ${fallbackLon.toFixed(2)}`,
    temp: convertTemp(tempCelsius, units),
    feelsLike: convertTemp(feelsLikeCelsius, units),
    condition: cur?.condition || "",
    humidity: cur?.humidity,
    windSpeed: convertWind(windKmh, units),
    aiSummary:
      weather.ai_summary || "No AI summary available for this request.",
    forecastDays,
  };
}
