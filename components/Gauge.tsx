"use client";

import type { Units } from "@/lib/types";

const GAUGE_CIRCUMFERENCE = 251.2;

interface GaugeProps {
  temp: number;
  units: Units;
}

export default function Gauge({ temp, units }: GaugeProps) {
  const min = units === "metric" ? -10 : 14;
  const max = units === "metric" ? 40 : 104;
  const clamped = Math.max(min, Math.min(max, temp));
  const pct = (clamped - min) / (max - min);
  const dashOffset = GAUGE_CIRCUMFERENCE * (1 - pct);
  const angle = -90 + pct * 180;

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 200 120" className="gauge" aria-hidden="true">
        <path d="M 20 110 A 80 80 0 0 1 180 110" className="gauge-track" />
        <path
          d="M 20 110 A 80 80 0 0 1 180 110"
          className="gauge-fill"
          style={{
            strokeDasharray: GAUGE_CIRCUMFERENCE,
            strokeDashoffset: dashOffset,
          }}
        />
        <line
          x1="100"
          y1="110"
          x2="100"
          y2="40"
          className="gauge-needle"
          style={{ transform: `rotate(${angle}deg)` }}
        />
        <circle cx="100" cy="110" r="5" className="gauge-hub" />
        <text x="20" y="112" className="gauge-scale-label" textAnchor="middle">
          {min}°
        </text>
        <text x="180" y="112" className="gauge-scale-label" textAnchor="middle">
          {max}°
        </text>
      </svg>
    </div>
  );
}
