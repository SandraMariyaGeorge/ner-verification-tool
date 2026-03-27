const headers = {
  "Content-Type": "application/json"
};

async function parseResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  return parseResponse(res);
}

export async function getPreview(limit = 50) {
  const res = await fetch(`/api/preview?limit=${limit}`);
  return parseResponse(res);
}

export async function getSample(size = 100) {
  const res = await fetch(`/api/sample?size=${size}`);
  return parseResponse(res);
}

export async function updateSingleTag(token, newTag) {
  const res = await fetch("/api/update", {
    method: "PUT",
    headers,
    body: JSON.stringify({
      word: token.word,
      sentence_id: token.sentence_id,
      position: token.position,
      new_tag: newTag
    })
  });
  return parseResponse(res);
}

export async function getEntityOccurrences(word) {
  const res = await fetch(`/api/entity?word=${encodeURIComponent(word)}`);
  return parseResponse(res);
}

export async function bulkUpdateEntity(word, newTag) {
  const res = await fetch("/api/entity/update", {
    method: "PUT",
    headers,
    body: JSON.stringify({ word, new_tag: newTag })
  });
  return parseResponse(res);
}

export async function getPatternErrors() {
  const res = await fetch("/api/patterns/errors");
  return parseResponse(res);
}

export async function applyPatternFix(item) {
  const res = await fetch("/api/patterns/fix", {
    method: "PUT",
    headers,
    body: JSON.stringify(item)
  });
  return parseResponse(res);
}

export async function downloadDataset() {
  const res = await fetch("/api/export");
  if (!res.ok) {
    throw new Error("Export failed");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "corrected_dataset.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
