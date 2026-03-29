"use client";

import { useEffect, useMemo, useState } from "react";
import TagDropdown from "../../../components/Common/TagDropdown";
import {
  downloadDataset,
  getPreview,
  getProject,
  getProjectStats,
  getSample,
  markSampleCorrect,
  markSampleFlag
} from "../../../lib/api";

export default function ProjectWorkspacePage({ params }) {
  const projectId = params.id;
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [sampleData, setSampleData] = useState([]);
  const [sampleSize, setSampleSize] = useState(20);
  const [previewSearch, setPreviewSearch] = useState("");
  const [editedTags, setEditedTags] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("preview");
  const [info, setInfo] = useState("Loading project workspace...");

  const activeUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("activeUser");
    if (!raw) return null;
    try {
      return JSON.parse(raw).user_id || null;
    } catch {
      return null;
    }
  }, []);

  const loadOverview = async () => {
    const [projectData, statsData] = await Promise.all([
      getProject(projectId),
      getProjectStats(projectId)
    ]);
    const preview = await getPreview(500000, projectId);
    setProject(projectData);
    setStats(statsData);
    setPreviewData(preview?.items || []);
  };

  const loadSampleQueue = async (size = sampleSize) => {
    const sample = await getSample(size, projectId);
    const items = sample?.items || [];
    setSampleData(items);
    return items;
  };

  useEffect(() => {
    window.localStorage.setItem("activeProjectId", projectId);
    setLoading(true);
    loadOverview()
      .then(() => {
        setInfo("Project workspace ready.");
      })
      .catch((error) => setInfo(error.message || "Failed to load project."))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleExport = async () => {
    try {
      await downloadDataset(projectId);
      setInfo("Corrected dataset downloaded.");
    } catch (error) {
      setInfo(error.message || "Export failed.");
    }
  };

  const handleGenerateSample = async () => {
    setLoading(true);
    try {
      const items = await loadSampleQueue(sampleSize);
      setEditedTags({});
      if (items.length) {
        setInfo(`Loaded ${items.length} unverified samples.`);
      } else {
        setInfo("No unverified samples available right now.");
      }
    } catch (error) {
      setInfo(error.message || "Failed to load sample.");
    } finally {
      setLoading(false);
    }
  };

  const handleCorrect = async (sampleItem) => {
    try {
      const tokenId = sampleItem?.target?.id;
      if (!tokenId) return;
      const updates = (sampleItem?.context || [])
        .filter((token) => token?.id && editedTags[token.id] && editedTags[token.id] !== token.tag)
        .map((token) => ({ id: token.id, new_tag: editedTags[token.id] }));

      const result = await markSampleCorrect([tokenId], projectId, activeUserId, updates);
      await Promise.all([loadOverview(), loadSampleQueue(sampleSize)]);
      setInfo(result?.message || "Marked as correct.");
    } catch (error) {
      setInfo(error.message || "Failed to mark as correct.");
    }
  };

  const handleFlag = async (sampleItem) => {
    try {
      const tokenId = sampleItem?.target?.id;
      if (!tokenId) return;
      const result = await markSampleFlag([tokenId], projectId, activeUserId);

      if (result?.item?.target?.id) {
        const expandedItem = result.item;
        setSampleData((prev) =>
          prev.map((item) => (item?.target?.id === tokenId ? expandedItem : item))
        );
        setInfo(result?.message || "Context expanded.");
      } else {
        setInfo(result?.message || "Unable to expand context.");
      }
    } catch (error) {
      setInfo(error.message || "Failed to expand context.");
    }
  };

  const renderStatusChip = (status) => {
    if (status === "verified") return <span style={{ color: "#15803d" }}>Verified</span>;
    if (status === "flagged") return <span style={{ color: "#c2410c" }}>Flagged</span>;
    return <span style={{ color: "#4b5563" }}>Unverified</span>;
  };

  const filteredPreviewData = previewSearch.trim()
    ? previewData.filter((t) => t.word?.toLowerCase().includes(previewSearch.trim().toLowerCase()))
    : previewData;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section
        className="card"
        style={{
          padding: 22,
          background: "linear-gradient(135deg, #ffffff 0%, #f3f8f6 54%, #eef6f2 100%)",
          border: "1px solid #d4dfd9"
        }}
      >
        <div className="controls-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.8rem" }}>{project?.name || "Project"}</h2>
          </div>
          <span className="badge">Workspace Live</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginTop: 16
          }}
        >
          <div style={{ background: "#ffffff", border: "1px solid #d9e4dd", borderRadius: 12, padding: "10px 12px" }}>
            <div className="small">Tokens</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{stats?.total ?? project?.total_tokens ?? 0}</div>
          </div>
          <div style={{ background: "#ffffff", border: "1px solid #d9e4dd", borderRadius: 12, padding: "10px 12px" }}>
            <div className="small">Sentences</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{project?.total_sentences || 0}</div>
          </div>
          <div style={{ background: "#ffffff", border: "1px solid #d9e4dd", borderRadius: 12, padding: "10px 12px" }}>
            <div className="small">Verified</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{stats?.verified ?? 0}</div>
          </div>
          <div style={{ background: "#ffffff", border: "1px solid #d9e4dd", borderRadius: 12, padding: "10px 12px" }}>
            <div className="small">Unverified</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{stats?.unverified ?? 0}</div>
          </div>
          <div style={{ background: "#ffffff", border: "1px solid #d9e4dd", borderRadius: 12, padding: "10px 12px" }}>
            <div className="small">Flagged</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{stats?.flagged ?? 0}</div>
          </div>
          <div style={{ background: "#ffffff", border: "1px solid #d9e4dd", borderRadius: 12, padding: "10px 12px" }}>
            <div className="small">Errors Detected</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{stats?.edited ?? 0}</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="small">Progress: {stats?.progress ?? 0}% verified</div>
          <div style={{ width: "100%", height: 12, borderRadius: 999, background: "#dce8e2", overflow: "hidden", marginTop: 6 }}>
            <div
              style={{
                width: `${stats?.progress ?? 0}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #2f6f60 0%, #16a34a 100%)"
              }}
            />
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 18 }}>
        <div className="controls-row" style={{ justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "inline-flex", gap: 6, background: "#edf3ef", padding: 6, borderRadius: 12 }}>
            <button
              onClick={() => setActiveSection("preview")}
              style={{
                background: activeSection === "preview" ? "#2f6f60" : "transparent",
                color: activeSection === "preview" ? "#ffffff" : "#1f2a22",
                borderRadius: 8,
                padding: "9px 14px"
              }}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveSection("sampling")}
              style={{
                background: activeSection === "sampling" ? "#2f6f60" : "transparent",
                color: activeSection === "sampling" ? "#ffffff" : "#1f2a22",
                borderRadius: 8,
                padding: "9px 14px"
              }}
            >
              Random Sampling
            </button>
          </div>
          <span className="small" style={{ background: "#f5f7f2", padding: "6px 10px", borderRadius: 999, border: "1px solid #d8ddd2" }}>
            {loading ? "Loading..." : info}
          </span>
        </div>
      </section>

      {activeSection === "preview" ? (
        <section className="card" style={{ padding: 18 }}>
          <div className="controls-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Dataset Preview</h3>
            <button onClick={handleExport}>Export Corrected Dataset</button>
          </div>
          <div className="controls-row" style={{ marginBottom: 10 }}>
            <input
              placeholder="Search token (word)"
              value={previewSearch}
              onChange={(e) => setPreviewSearch(e.target.value)}
              style={{ minWidth: 240 }}
            />
          </div>
          <div className="small" style={{ marginBottom: 8 }}>
            {previewData.length
              ? `${filteredPreviewData.length} / ${previewData.length} tokens shown`
              : "No preview data available."}
          </div>
          <div className="list" style={{ marginTop: 8, maxHeight: 520, overflowY: "auto", paddingRight: 6 }}>
            {filteredPreviewData.map((t, idx) => (
              <div
                key={`${t.sentence_id}-${t.position}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(130px, auto) minmax(120px, auto) 1fr",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid #e0e6de",
                  borderRadius: 10,
                  background: "#fcfdfb"
                }}
              >
                <div style={{ fontWeight: 700 }}>{t.word}</div>
                <div className="badge" style={{ width: "fit-content" }}>{t.tag}</div>
                <div className="small" style={{ textAlign: "right" }}>{renderStatusChip(t.verification_status)}</div>
              </div>
            ))}
            {previewData.length > 0 && filteredPreviewData.length === 0 && (
              <p className="small">No tokens matched your search.</p>
            )}
          </div>
        </section>
      ) : (
        <section className="card" style={{ padding: 18 }}>
          <div className="controls-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Random Sampling</h3>
            <div className="controls-row">
              <label className="small">Sample Size</label>
              <input
                type="number"
                min={1}
                max={200}
                value={sampleSize}
                onChange={(e) => setSampleSize(Number(e.target.value || 20))}
                style={{ maxWidth: 120 }}
              />
              <button onClick={handleGenerateSample} disabled={loading}>
                {loading ? "Loading..." : "Generate"}
              </button>
            </div>
          </div>

          <div className="list" style={{ marginTop: 6 }}>
            {sampleData.length > 0 && (
              <div
                style={{
                  border: "1px solid #dbe4dc",
                  borderRadius: 12,
                  padding: 12,
                  background: "#f9fcfa"
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Generated Tokens</div>
                <div className="controls-row" style={{ gap: 8 }}>
                  {sampleData.map((item) => {
                    const target = item.target || {};
                    const key = target.id || `${target.sentence_id}-${target.position}`;
                    const selectedTag = target.id ? editedTags[target.id] || target.tag : target.tag;
                    return (
                      <span
                        key={`gen-${key}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          border: "1px solid #cfe0d6",
                          borderRadius: 999,
                          padding: "4px 10px",
                          background: "#ffffff",
                          fontSize: "0.9rem"
                        }}
                      >
                        <strong>{target.word}</strong>
                        <span className="small">{selectedTag}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {sampleData.map((item) => {
              const target = item.target || {};
              const tokenId = target.id;
              return (
                <div
                  key={tokenId || `${target.sentence_id}-${target.position}`}
                  style={{
                    border: "1px solid #dbe4dc",
                    borderRadius: 12,
                    padding: 14,
                    background: "#ffffff",
                    boxShadow: "0 4px 14px rgba(35, 56, 47, 0.05)"
                  }}
                >
                  <div style={{ marginTop: 6, lineHeight: 2 }}>
                    {item.context?.map((c) => (
                      <div
                        key={c.id || `${tokenId}-${c.position}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          marginRight: 8,
                          marginBottom: 8,
                          fontWeight: c.position === target.position ? 700 : 500,
                          background: c.position === target.position ? "#dff1e9" : "#f5f8f4",
                          border: c.position === target.position ? "1px solid #93d2b9" : "1px solid #e3eadf",
                          padding: "4px 8px",
                          borderRadius: 999
                        }}
                      >
                        <span>{c.word}</span>
                        <TagDropdown
                          value={(c.id && editedTags[c.id]) || c.tag}
                          onChange={(newTag) => {
                            if (!c.id) return;
                            setEditedTags((prev) => ({ ...prev, [c.id]: newTag }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="controls-row" style={{ marginTop: 12 }}>
                    <button onClick={() => handleCorrect(item)}>Correct</button>
                    <button className="secondary" onClick={() => handleFlag(item)}>Flag</button>
                  </div>
                </div>
              );
            })}
            {!sampleData.length && <p className="small">No unverified samples available.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
