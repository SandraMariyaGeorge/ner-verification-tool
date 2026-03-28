import { backendUrl } from "../../../lib/proxy";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id") || "";

  const res = await fetch(backendUrl(`/export?project_id=${encodeURIComponent(projectId)}`), {
    method: "GET",
    cache: "no-store"
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=corrected_dataset.txt"
    }
  });
}
