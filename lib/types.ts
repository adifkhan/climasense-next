export type Units = "metric" | "imperial";

export interface City {
  name: string;
  lat: number;
  lon: number;
}

export interface CurrentConditions {
  time: string;
  temperature?: number;
  windspeed?: number;
  winddirection: number;
  weathercode: number;
  condition?: string;
  humidity?: number;
}

export interface ForecastDay {
  date?: string;
  day?: string;
  temp_max?: number;
  max?: number;
  high?: number;
  temp_min?: number;
  min?: number;
  low?: number;
}

export interface WeatherResponse {
  location?: { name?: string };
  current?: CurrentConditions;
  forecast?: ForecastDay[];
  daily?: ForecastDay[];
  ai_summary?: string;
  temperature?: number;
  condition?: string;
}

export interface GeoHeaders {
  country?: string;
  region?: string;
  city?: string;
}

export interface UsageResponse {
  requests?: number;
  used?: number;
  requestCount?: number;
  limit?: number;
  requestLimit?: number;
}
