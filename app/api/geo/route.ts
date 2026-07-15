import { NextRequest, NextResponse } from "next/server";
import { callWeatherAI } from "@/lib/weatherClient";
import { getClientIpFromRequest } from "@/lib/getClientIp";
import type { WeatherResponse } from "@/lib/types";

export async function GET(req: NextRequest) {
  const incoming = req.nextUrl.searchParams;
  const params = new URLSearchParams();

  if (incoming.get("lat") && incoming.get("lon")) {
    params.set("lat", incoming.get("lat")!);
    params.set("lon", incoming.get("lon")!);
  } else {
    const realIp = getClientIpFromRequest(req);
    params.set("ip", realIp ?? "auto");
  }
  params.set("days", "7");
  params.set("ai", "true");

  const result = await callWeatherAI<WeatherResponse>(
    "/v1/weather-geo",
    params,
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

  const headers: Record<string, string> = { "X-Cache": result.cacheStatus };
  if (result.geoHeaders?.city) headers["X-City"] = result.geoHeaders.city;
  if (result.geoHeaders?.region) headers["X-Region"] = result.geoHeaders.region;
  if (result.geoHeaders?.country)
    headers["X-Country"] = result.geoHeaders.country;

  return NextResponse.json(result.data, { headers });
}
