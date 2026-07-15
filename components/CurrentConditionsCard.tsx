import Gauge from "./Gauge";
import type { Units } from "@/lib/types";

interface CurrentConditionsCardProps {
  time: string;
  locationName: string;
  temp: number;
  feelsLike: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  units: Units;
}

export default function CurrentConditionsCard({
  time,
  locationName,
  temp,
  feelsLike,
  condition,
  humidity,
  windSpeed,
  units,
}: CurrentConditionsCardProps) {
  const unitLabel = units === "metric" ? "°C" : "°F";

  return (
    <article className="current-card">
      <div className="current-main">
        <span className="eyebrow">READING {time}</span>
        <h2>{locationName}</h2>
        <div className="current-temp">
          <span>{Math.round(temp)}</span>
          <span className="temp-unit">{unitLabel}</span>
        </div>
        <p className="condition">{condition}</p>
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
          <span>{humidity ?? "—"}%</span>
        </div>
        <div>
          <span className="meta-label">Wind</span>
          <span>
            {windSpeed ?? "—"} {units === "metric" ? "km/h" : "mph"}
          </span>
        </div>
      </div>
    </article>
  );
}
