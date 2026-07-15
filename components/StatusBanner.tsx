'use client';

import { useEffect, useState } from 'react';

interface StatusBannerProps {
  message: string;
  isError: boolean;
  retryAfterSeconds?: number;
  onRetry?: () => void;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function StatusBanner({ message, isError, retryAfterSeconds, onRetry }: StatusBannerProps) {
  const [remaining, setRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    setRemaining(retryAfterSeconds);
    if (retryAfterSeconds === undefined) return;

    const interval = setInterval(() => {
      setRemaining((prev) => (prev === undefined ? undefined : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfterSeconds]);

  if (!message) return <section className="status-area" aria-live="polite" />;

  return (
    <section className={`status-area ${isError ? 'error' : ''}`} aria-live="polite">
      {message}
      {remaining !== undefined && remaining > 0 && <span> — try again in {formatDuration(remaining)}</span>}
      {isError && onRetry && (remaining === undefined || remaining === 0) && (
        <button type="button" className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </section>
  );
}
