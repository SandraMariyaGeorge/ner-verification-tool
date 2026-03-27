import { NextResponse } from "next/server";
import { backendUrl, toJsonOrText } from "../../../lib/proxy";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const size = searchParams.get("size") || "100";

  const res = await fetch(backendUrl(`/sample?size=${encodeURIComponent(size)}`), {
    method: "GET",
    cache: "no-store"
  });

  const data = await toJsonOrText(res);
  return NextResponse.json(data, { status: res.status });
}
