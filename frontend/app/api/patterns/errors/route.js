import { NextResponse } from "next/server";
import { backendUrl, toJsonOrText } from "../../../../lib/proxy";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id") || "";

  const res = await fetch(backendUrl(`/patterns/errors?project_id=${encodeURIComponent(projectId)}`), {
    method: "GET",
    cache: "no-store"
  });

  const data = await toJsonOrText(res);
  return NextResponse.json(data, { status: res.status });
}
