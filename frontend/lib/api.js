const headers = {
  "Content-Type": "application/json"
};

function getActiveProjectId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("activeProjectId") || "";
}

function withProjectId(projectId) {
  const resolved = projectId || getActiveProjectId();
  if (!resolved) {
    throw new Error("Project ID is required. Open a project from dashboard first.");
  }
  return resolved;
}

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
  const projectId = withProjectId();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("project_id", projectId);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  return parseResponse(res);
}

export async function getPreview(limit = 50, projectId) {
  const pid = withProjectId(projectId);
  const res = await fetch(`/api/preview?limit=${limit}&project_id=${encodeURIComponent(pid)}`);
  return parseResponse(res);
}

export async function getSample(size = 100, projectId) {
  const pid = withProjectId(projectId);
  const res = await fetch(`/api/sample?size=${size}&project_id=${encodeURIComponent(pid)}`);
  return parseResponse(res);
}

export async function updateSingleTag(token, newTag, projectId) {
  const pid = withProjectId(projectId);
  const res = await fetch("/api/update", {
    method: "PUT",
    headers,
    body: JSON.stringify({
      word: token.word,
      project_id: pid,
      sentence_id: token.sentence_id,
      position: token.position,
      new_tag: newTag
    })
  });
  return parseResponse(res);
}

export async function getEntityOccurrences(word, projectId) {
  const pid = withProjectId(projectId);
  const res = await fetch(`/api/entity?word=${encodeURIComponent(word)}&project_id=${encodeURIComponent(pid)}`);
  return parseResponse(res);
}

export async function bulkUpdateEntity(word, newTag, projectId) {
  const pid = withProjectId(projectId);
  const res = await fetch("/api/entity/update", {
    method: "PUT",
    headers,
    body: JSON.stringify({ project_id: pid, word, new_tag: newTag })
  });
  return parseResponse(res);
}

export async function getPatternErrors(projectId) {
  const pid = withProjectId(projectId);
  const res = await fetch(`/api/patterns/errors?project_id=${encodeURIComponent(pid)}`);
  return parseResponse(res);
}

export async function applyPatternFix(item, projectId) {
  const pid = withProjectId(projectId);
  const res = await fetch("/api/patterns/fix", {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...item, project_id: pid })
  });
  return parseResponse(res);
}

export async function downloadDataset(projectId) {
  const pid = withProjectId(projectId);
  const res = await fetch(`/api/export?project_id=${encodeURIComponent(pid)}`);
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

export async function signup(payload) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  return parseResponse(res);
}

export async function login(payload) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  return parseResponse(res);
}

export async function createProject(payload) {
  const res = await fetch("/api/projects/create", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  return parseResponse(res);
}

export async function listProjects(userId) {
  const res = await fetch(`/api/projects?user_id=${encodeURIComponent(userId)}`, {
    method: "GET",
    cache: "no-store"
  });
  return parseResponse(res);
}

export async function getProject(projectId) {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "GET",
    cache: "no-store"
  });
  return parseResponse(res);
}
