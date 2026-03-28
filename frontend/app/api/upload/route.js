import { NextResponse } from "next/server";
import { backendUrl, toJsonOrText } from "../../../lib/proxy";

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const projectId = formData.get("project_id");

  const body = new FormData();
  if (file) body.append("file", file);
  if (projectId) body.append("project_id", projectId);

  const res = await fetch(backendUrl("/upload"), {
    method: "POST",
    body
  });

  const data = await toJsonOrText(res);
  return NextResponse.json(data, { status: res.status });
}
