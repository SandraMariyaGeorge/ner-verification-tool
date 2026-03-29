"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, listProjects, uploadDataset } from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [, setStatus] = useState("Create or open a project.");

  const refreshProjects = async (userId) => {
    const data = await listProjects(userId);
    setProjects(data?.items || []);
  };

  useEffect(() => {
    const raw = window.localStorage.getItem("activeUser");
    if (!raw) {
      router.replace("/login");
      return;
    }

    const parsed = JSON.parse(raw);
    setUser(parsed);
    refreshProjects(parsed.user_id).catch(() => setStatus("Failed to load projects."));
  }, [router]);

  const handleCreateProject = async () => {
    if (!user?.user_id) {
      setStatus("Please login again.");
      return;
    }
    if (!name.trim()) {
      setStatus("Project name is required.");
      return;
    }

    setLoading(true);
    try {
      const result = await createProject({ user_id: user.user_id, name: name.trim(), file_name: file?.name || null });
      const projectId = result.project_id;
      window.localStorage.setItem("activeProjectId", projectId);

      if (file) {
        await uploadDataset(file);
      }

      await refreshProjects(user.user_id);
      setStatus("Project created successfully.");
      setName("");
      setFile(null);
    } catch (error) {
      setStatus(error.message || "Project creation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = (projectId) => {
    window.localStorage.setItem("activeProjectId", projectId);
    router.push(`/project/${projectId}`);
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>Welcome {user?.name || "User"}</h2>
        <p className="small">Create a project, upload a dataset, and start verification.</p>
        <div className="controls-row">
          <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="file" accept=".txt,.conll" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button onClick={handleCreateProject} disabled={loading}>{loading ? "Creating..." : "Create Project"}</button>
        </div>
      </section>

      <section className="card">
        <h3>Your Projects</h3>
        <div className="list">
          {projects.map((project) => (
            <div className="card" key={project.id}>
              <div><strong>{project.name}</strong></div>
              <div className="small">Tokens: {project.total_tokens || 0} | Sentences: {project.total_sentences || 0} | Status: {project.status}</div>
              <div className="controls-row" style={{ marginTop: 8 }}>
                <button onClick={() => handleOpenProject(project.id)}>Open</button>
              </div>
            </div>
          ))}
          {!projects.length && <p className="small">No projects yet.</p>}
        </div>
      </section>
    </div>
  );
}
