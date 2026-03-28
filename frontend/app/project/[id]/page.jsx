"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { downloadDataset, getProject } from "../../../lib/api";

export default function ProjectWorkspacePage({ params }) {
  const projectId = params.id;
  const [project, setProject] = useState(null);
  const [status, setStatus] = useState("Loading project...");

  useEffect(() => {
    window.localStorage.setItem("activeProjectId", projectId);
    getProject(projectId)
      .then((data) => {
        setProject(data);
        setStatus("Project workspace ready.");
      })
      .catch((error) => setStatus(error.message || "Failed to load project."));
  }, [projectId]);

  const handleExport = async () => {
    try {
      await downloadDataset(projectId);
      setStatus("Corrected dataset downloaded.");
    } catch (error) {
      setStatus(error.message || "Export failed.");
    }
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>{project?.name || "Project"}</h2>
        <p className="small">Project ID: {projectId}</p>
        <p className="small">Tokens: {project?.total_tokens || 0} | Sentences: {project?.total_sentences || 0}</p>
      </section>

      <section className="card">
        <h3>Workspace Modules</h3>
        <div className="controls-row">
          <Link href={`/project/${projectId}/sampling`}>Sampling</Link>
          <Link href={`/project/${projectId}/entity`}>Entity Fix</Link>
          <Link href={`/project/${projectId}/patterns`}>Pattern Fix</Link>
          <button onClick={handleExport}>Export</button>
        </div>
      </section>

      <section className="card">
        <h3>Status</h3>
        <p>{status}</p>
      </section>
    </div>
  );
}
