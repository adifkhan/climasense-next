import { NextRequest, NextResponse } from "next/server";
import { callWeatherAI } from "@/lib/weatherClient";
import type { WeatherResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  const result = await callWeatherAI<WeatherResponse>(
    "/v1/weather",
    req.nextUrl.searchParams,
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error.message,
        retryAfterSeconds: result.error.retryAfterSeconds,
      },
      { status: result.error.status },
    );
  }

  return NextResponse.json(result.data, {
    headers: { "X-Cache": result.cacheStatus },
  });
}
