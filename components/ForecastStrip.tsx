import type { ForecastDay } from '@/lib/types';

interface ForecastStripProps {
  days: ForecastDay[];
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
        const hi = Math.round(day.temp_max ?? day.max ?? day.high ?? 0);
        const lo = Math.round(day.temp_min ?? day.min ?? day.low ?? 0);

        return (
          <div className="forecast-day" key={date ? date.toISOString() : i}>
            <div className="day-label">{label}</div>
            <div className="day-hi">{hi}°</div>
            <div className="day-lo">{lo}{unitLabel}</div>
          </div>
        );
      })}
    </div>
  );
}
