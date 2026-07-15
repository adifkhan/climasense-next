export interface ApiErrorInfo {
  status: number;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${s}s`;
}

export function describeUpstreamError(
  status: number,
  body: unknown,
  headers: Headers,
): ApiErrorInfo {
  const rawMessage =
    body && typeof body === "object"
      ? ((body as { error?: string; message?: string }).error ??
        (body as { message?: string }).message)
      : undefined;

  switch (status) {
    case 400:
      return {
        status,
        message: rawMessage || "Request was missing required parameters.",
        retryable: false,
      };

    case 401:
      return {
        status,
        message:
          "The server's WeatherAI API key is missing or invalid — this is a configuration issue, not something you can fix here.",
        retryable: false,
      };

    case 403:
      return {
        status,
        message:
          rawMessage ||
          "This feature isn't available on the current WeatherAI plan.",
        retryable: false,
      };

    case 429: {
      const resetHeader = headers.get("x-ratelimit-reset");
      const resetEpochSeconds = resetHeader ? parseInt(resetHeader, 10) : NaN;
      const retryAfterSeconds = Number.isFinite(resetEpochSeconds)
        ? Math.max(0, resetEpochSeconds - Math.floor(Date.now() / 1000))
        : undefined;
      return {
        status,
        message:
          retryAfterSeconds !== undefined
            ? `Monthly request quota exceeded. Resets in ${formatDuration(retryAfterSeconds)}.`
            : "Monthly request quota exceeded.",
        retryable: false,
        retryAfterSeconds,
      };
    }

    case 500:
      return {
        status,
        message:
          "WeatherAI had an internal error and automatic retries were exhausted. Try again shortly.",
        retryable: true,
      };

    case 503:
      return {
        status,
        message: "WeatherAI is temporarily unavailable. Try again in a moment.",
        retryable: true,
      };

    default:
      return {
        status,
        message: rawMessage || `Unexpected error (HTTP ${status}).`,
        retryable: false,
      };
  }
}
