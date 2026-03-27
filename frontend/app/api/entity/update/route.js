import { NextResponse } from "next/server";
import { backendUrl, toJsonOrText } from "../../../../lib/proxy";

export async function PUT(request) {
  const payload = await request.json();

  const res = await fetch(backendUrl("/entity/update"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await toJsonOrText(res);
  return NextResponse.json(data, { status: res.status });
}
