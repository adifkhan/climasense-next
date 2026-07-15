import { headers } from "next/headers";
import type { NextRequest } from "next/server";

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

export function getClientIpFromRequest(req: NextRequest): string | null {
  return (
    firstForwardedIp(req.headers.get("x-forwarded-for")) ||
    req.headers.get("x-real-ip")
  );
}

export function getClientIpFromHeaders(): string | null {
  const h = headers();
  return firstForwardedIp(h.get("x-forwarded-for")) || h.get("x-real-ip");
}
