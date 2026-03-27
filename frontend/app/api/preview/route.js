import { NextResponse } from "next/server";
import { backendUrl, toJsonOrText } from "../../../lib/proxy";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "50";

  const res = await fetch(backendUrl(`/preview?limit=${encodeURIComponent(limit)}`), {
    method: "GET",
    cache: "no-store"
  });

  const data = await toJsonOrText(res);
  return NextResponse.json(data, { status: res.status });
}
