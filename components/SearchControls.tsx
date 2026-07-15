import type { FormEvent } from 'react';
import type { City, Units } from '@/lib/types';

interface SearchControlsProps {
  latInput: string;
  lonInput: string;
  onLatChange: (value: string) => void;
  onLonChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onLocate: () => void;
  units: Units;
  onUnitsChange: (units: Units) => void;
  cities: City[];
  onCityClick: (lat: number, lon: number) => void;
  disabled: boolean;
}

export default function SearchControls({
  latInput,
  lonInput,
  onLatChange,
  onLonChange,
  onSubmit,
  onLocate,
  units,
  onUnitsChange,
  cities,
  onCityClick,
  disabled,
}: SearchControlsProps) {
  return (
    <section className="controls">
      <form className="search-form" onSubmit={onSubmit}>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Latitude (e.g. -1.2921)"
          value={latInput}
          onChange={(e) => onLatChange(e.target.value)}
          required
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="Longitude (e.g. 36.8219)"
          value={lonInput}
          onChange={(e) => onLonChange(e.target.value)}
          required
        />
        <button type="submit" disabled={disabled}>
          Get Weather
        </button>
      </form>

      <div className="quick-actions">
        <button className="ghost-btn" type="button" onClick={onLocate} disabled={disabled}>
          📍 Use my location
        </button>
        <div className="city-chips">
          {cities.map((city) => (
            <button
              key={city.name}
              className="chip"
              type="button"
              onClick={() => onCityClick(city.lat, city.lon)}
              disabled={disabled}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      <div className="unit-toggle" role="group" aria-label="Units">
        <button
          type="button"
          className={`unit-btn ${units === 'metric' ? 'active' : ''}`}
          onClick={() => onUnitsChange('metric')}
        >
          °C
        </button>
        <button
          type="button"
          className={`unit-btn ${units === 'imperial' ? 'active' : ''}`}
          onClick={() => onUnitsChange('imperial')}
        >
          °F
        </button>
      </div>
    </section>
  );
}
