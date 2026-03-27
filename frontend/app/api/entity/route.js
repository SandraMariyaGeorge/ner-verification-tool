import { NextResponse } from "next/server";
import { backendUrl, toJsonOrText } from "../../../lib/proxy";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word") || "";

  const res = await fetch(backendUrl(`/entity?word=${encodeURIComponent(word)}`), {
    method: "GET",
    cache: "no-store"
  });

  const data = await toJsonOrText(res);
  return NextResponse.json(data, { status: res.status });
}
