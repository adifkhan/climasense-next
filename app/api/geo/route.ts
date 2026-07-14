import { NextRequest } from "next/server";
import { proxyWeatherAI } from "@/lib/proxyWeatherAI";

export async function GET(req: NextRequest) {
  return proxyWeatherAI("/v1/weather-geo", req.nextUrl.searchParams);
}
