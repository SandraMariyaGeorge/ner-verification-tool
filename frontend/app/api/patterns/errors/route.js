import { NextResponse } from "next/server";
import { backendUrl, toJsonOrText } from "../../../../lib/proxy";

export async function GET() {
  const res = await fetch(backendUrl("/patterns/errors"), {
    method: "GET",
    cache: "no-store"
  });

  const data = await toJsonOrText(res);
  return NextResponse.json(data, { status: res.status });
}
