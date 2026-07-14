export interface CurrentConditions {
  temp?: number;
  temperature?: number;
  feels_like?: number;
  feelsLike?: number;
  condition?: string;
  summary?: string;
  description?: string;
  humidity?: number;
  wind_speed?: number;
  windSpeed?: number;
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
  summary?: string;
  temp?: number;
  temperature?: number;
  condition?: string;
}

export interface GeoResponse {
  ip?: string;
  geo?: {
    lat?: number;
    lon?: number;
    city?: string;
    region?: string;
    country?: string;
    timezone?: string;
  };
  lat?: number;
  lon?: number;
}

export interface UsageResponse {
  requests?: number;
  used?: number;
  requestCount?: number;
  limit?: number;
  requestLimit?: number;
}
