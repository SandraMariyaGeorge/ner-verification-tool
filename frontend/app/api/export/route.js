import { backendUrl } from "../../../lib/proxy";

export async function GET() {
  const res = await fetch(backendUrl("/export"), {
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
