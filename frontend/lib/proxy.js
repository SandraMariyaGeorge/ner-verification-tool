const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "http://127.0.0.1:8000";

export function backendUrl(pathWithQuery) {
  return `${BACKEND_BASE_URL}${pathWithQuery}`;
}

export async function toJsonOrText(response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }
  return text;
}
