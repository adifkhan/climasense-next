import type { ForecastDayView } from '@/lib/deriveWeatherView';

interface ForecastStripProps {
  days: ForecastDayView[];
  unitLabel: string;
}

export default function ForecastStrip({ days, unitLabel }: ForecastStripProps) {
  if (!days || days.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No forecast data returned for this location.</p>;
  }

  return (
    <div className="forecast-strip">
      {days.slice(0, 7).map((day, i) => {
        const date = day.date ? new Date(day.date) : null;
        const label = date ? date.toLocaleDateString([], { weekday: 'short' }) : day.day || `Day ${i + 1}`;

        return (
          <div className="forecast-day" key={date ? date.toISOString() : i}>
            <div className="day-label">{label}</div>
            <div className="day-hi">{Math.round(day.high)}°</div>
            <div className="day-lo">{Math.round(day.low)}{unitLabel}</div>
          </div>
        );
      })}
    </div>
  );
}
