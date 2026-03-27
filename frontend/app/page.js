"use client";

import { useState } from "react";
import { uploadDataset, downloadDataset } from "../lib/api";

export default function DashboardPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Upload a CoNLL-style file to start annotation verification.");

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please choose a dataset file first.");
      return;
    }

    setLoading(true);
    try {
      const result = await uploadDataset(file);
      setMessage(result?.message || "Dataset uploaded successfully.");
    } catch (error) {
      setMessage(error.message || "Dataset upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await downloadDataset();
      setMessage("Corrected dataset downloaded.");
    } catch (error) {
      setMessage(error.message || "Export failed.");
    }
  };

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2>Upload Dataset</h2>
        <p className="small">Expected format: one token per line as "word tag", blank line between sentences.</p>
        <div className="controls-row">
          <input type="file" accept=".txt,.conll" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button onClick={handleUpload} disabled={loading}>{loading ? "Uploading..." : "Upload Dataset"}</button>
        </div>
      </section>

      <section className="card">
        <h2>Export</h2>
        <p className="small">Download the corrected dataset from backend storage.</p>
        <button onClick={handleExport}>Download Corrected Dataset</button>
      </section>

      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h3>Status</h3>
        <p>{message}</p>
      </section>
    </div>
  );
}
