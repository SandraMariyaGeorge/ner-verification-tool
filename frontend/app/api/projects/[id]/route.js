import { NextResponse } from "next/server";
import { backendUrl, toJsonOrText } from "../../../../lib/proxy";

export async function GET(_request, { params }) {
  const projectId = params.id;

  const res = await fetch(backendUrl(`/projects/${encodeURIComponent(projectId)}`), {
    method: "GET",
    cache: "no-store"
  });

  const data = await toJsonOrText(res);
  return NextResponse.json(data, { status: res.status });
}
