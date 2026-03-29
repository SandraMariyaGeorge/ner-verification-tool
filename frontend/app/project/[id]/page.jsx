"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TagDropdown from "../../../components/Common/TagDropdown";
import {
  applyPatternFixSelection,
  detectSamplePatterns,
  downloadDataset,
  findPatternMatches,
  getPreview,
  getProject,
  getProjectStats,
  getSample,
  ignorePatternSuggestion,
  markSampleCorrect,
  markSampleFlag,
  verifyPreviewToken
} from "../../../lib/api";

export default function ProjectWorkspacePage({ params }) {
  const projectId = params.id;
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [sampleData, setSampleData] = useState([]);
  const [sampleSize, setSampleSize] = useState(20);
  const [previewSearch, setPreviewSearch] = useState("");
  const [jumpTokenId, setJumpTokenId] = useState(null);
  const [highlightPreviewTokenId, setHighlightPreviewTokenId] = useState(null);
  const [editedTags, setEditedTags] = useState({});
  const [fixPanels, setFixPanels] = useState({});
  const [similarModal, setSimilarModal] = useState({
    open: false,
    sampleTokenId: null,
    patternItem: null,
    matches: [],
    loading: false,
    processingTokenId: null
  });
  const [loading, setLoading] = useState(false);
  const [previewProcessingId, setPreviewProcessingId] = useState(null);
  const [activeSection, setActiveSection] = useState("preview");
  const [info, setInfo] = useState("Loading project workspace...");
  const previewRowRefs = useRef({});

  const patchFixPanel = (tokenId, patch) => {
    setFixPanels((prev) => ({
      ...prev,
      [tokenId]: {
        ...(prev[tokenId] || {}),
        ...patch
      }
    }));
  };

  const makePatternKey = (pattern, index) => `${index}:${(pattern || []).join("->")}`;

  const collectEditedInSample = (context = [], editedState = editedTags) =>
    context.reduce((acc, token) => {
      if (!token?.id) return acc;
      const nextTag = editedState[token.id];
      if (nextTag && nextTag !== token.tag) {
        acc[token.id] = nextTag;
      }
      return acc;
    }, {});

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

  useEffect(() => {
    if (!jumpTokenId) return;
    const row = previewRowRefs.current[jumpTokenId];
    if (!row) return;

    row.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightPreviewTokenId(jumpTokenId);
    const timer = setTimeout(() => setHighlightPreviewTokenId(null), 1800);
    setJumpTokenId(null);
    return () => clearTimeout(timer);
  }, [jumpTokenId, previewSearch, previewData.length]);

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
      setFixPanels({});
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
      setFixPanels({});
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
        setFixPanels((prev) => {
          const next = { ...prev };
          delete next[tokenId];
          return next;
        });
        setInfo(result?.message || "Context expanded.");
      } else {
        setInfo(result?.message || "Unable to expand context.");
      }
    } catch (error) {
      setInfo(error.message || "Failed to expand context.");
    }
  };

  const runFixDetection = async (sampleItem, editedState = editedTags, ensureOpen = true) => {
    const sampleTokenId = sampleItem?.target?.id;
    if (!sampleTokenId) return;
    const context = sampleItem?.context || [];
    const editedInSample = collectEditedInSample(context, editedState);

    if (!Object.keys(editedInSample).length) {
      if (ensureOpen) {
        patchFixPanel(sampleTokenId, {
          open: true,
          loadingPatterns: false,
          patterns: [],
          activePatternKey: null,
          matchesByKey: {},
          editedSummary: [],
          error: ""
        });
      }
      setInfo("Modify at least one tag in this sample before using Fix.");
      return;
    }

    patchFixPanel(sampleTokenId, {
      open: true,
      loadingPatterns: true,
      loadingMatches: false,
      applying: false,
      patterns: [],
      activePatternKey: null,
      matchesByKey: {},
      editedSummary: [],
      error: ""
    });

    try {
      const result = await detectSamplePatterns(context, projectId, sampleTokenId, editedInSample);
      const detected = (result?.items || []).map((patternItem, idx) => ({
        ...patternItem,
        key: makePatternKey(patternItem?.from_pattern || patternItem?.pattern, idx)
      }));
      const editedSummary = context
        .filter((token) => token?.id && editedInSample[token.id])
        .map((token) => ({
          id: token.id,
          word: token.word,
          from: token.tag,
          to: editedInSample[token.id]
        }));

      patchFixPanel(sampleTokenId, {
        open: true,
        loadingPatterns: false,
        patterns: detected,
        activePatternKey: detected[0]?.key || null,
        matchesByKey: {},
        editedSummary,
        error: ""
      });

      if (!detected.length) {
        setInfo("No suspicious pattern candidate from current edited tags.");
      }
    } catch (error) {
      patchFixPanel(sampleTokenId, {
        loadingPatterns: false,
        error: error.message || "Pattern detection failed."
      });
      setInfo(error.message || "Pattern detection failed.");
    }
  };

  const handleFix = async (sampleItem) => {
    const sampleTokenId = sampleItem?.target?.id;
    if (!sampleTokenId) return;

    const existing = fixPanels[sampleTokenId] || {};
    if (existing.open) {
      patchFixPanel(sampleTokenId, { open: false });
      return;
    }

    await runFixDetection(sampleItem, editedTags, true);
  };

  const handleViewSimilarCases = async (sampleTokenId, patternItem) => {
    const patternKey = patternItem?.key;
    if (!sampleTokenId || !patternKey) return;

    setSimilarModal({
      open: true,
      sampleTokenId,
      patternItem,
      matches: [],
      loading: true,
      processingTokenId: null
    });

    patchFixPanel(sampleTokenId, {
      loadingMatches: true,
      activePatternKey: patternKey,
      error: ""
    });

    try {
      const result = await findPatternMatches(
        patternItem?.from_pattern || [],
        projectId,
        5000,
        patternItem?.target_index ?? 1
      );
      const matches = result?.items || [];
      setFixPanels((prev) => {
        const current = prev[sampleTokenId] || {};
        const matchesByKey = current.matchesByKey || {};
        return {
          ...prev,
          [sampleTokenId]: {
            ...current,
            loadingMatches: false,
            activePatternKey: patternKey,
            matchesByKey: {
              ...matchesByKey,
              [patternKey]: matches
            }
          }
        };
      });
      setSimilarModal((prev) => ({
        ...prev,
        open: true,
        sampleTokenId,
        patternItem,
        matches,
        loading: false,
        processingTokenId: null
      }));
      setInfo(matches.length ? `Found ${matches.length} similar cases.` : "No similar cases found.");
    } catch (error) {
      patchFixPanel(sampleTokenId, {
        loadingMatches: false,
        error: error.message || "Failed to load similar cases."
      });
      setSimilarModal((prev) => ({ ...prev, loading: false }));
      setInfo(error.message || "Failed to load similar cases.");
    }
  };

  const closeSimilarModal = () => {
    setSimilarModal({
      open: false,
      sampleTokenId: null,
      patternItem: null,
      matches: [],
      loading: false,
      processingTokenId: null
    });
  };

  const handleApplySimilarCase = async (match) => {
    const patternItem = similarModal.patternItem;
    const sampleTokenId = similarModal.sampleTokenId;
    const tokenId = match?.target_token_id;
    const newTag = patternItem?.new_tag;
    if (!patternItem || !sampleTokenId || !tokenId || !newTag) return;

    setSimilarModal((prev) => ({ ...prev, processingTokenId: tokenId }));

    try {
      const result = await applyPatternFixSelection(
        {
          token_ids: [tokenId],
          new_tag: newTag,
          pattern: patternItem?.from_pattern || [],
          source_sample_token_id: sampleTokenId,
          verified_by: activeUserId
        },
        projectId
      );

      setSimilarModal((prev) => ({
        ...prev,
        processingTokenId: null,
        matches: (prev.matches || []).filter((item) => item?.target_token_id !== tokenId)
      }));
      setInfo(result?.message || "Similar case fix applied.");
      await loadOverview();
    } catch (error) {
      setSimilarModal((prev) => ({ ...prev, processingTokenId: null }));
      setInfo(error.message || "Failed to apply similar case fix.");
    }
  };

  const handleIgnoreSimilarCase = async (match) => {
    const patternItem = similarModal.patternItem;
    const sampleTokenId = similarModal.sampleTokenId;
    const tokenId = match?.target_token_id;
    if (!patternItem || !sampleTokenId || !tokenId) return;

    setSimilarModal((prev) => ({ ...prev, processingTokenId: tokenId }));

    try {
      await ignorePatternSuggestion(
        {
          pattern: patternItem?.from_pattern || [],
          source_sample_token_id: sampleTokenId,
          reason: `Ignored similar case token ${tokenId}`,
          verified_by: activeUserId
        },
        projectId
      );

      setSimilarModal((prev) => ({
        ...prev,
        processingTokenId: null,
        matches: (prev.matches || []).filter((item) => item?.target_token_id !== tokenId)
      }));
      setInfo("Similar case ignored.");
    } catch (error) {
      setSimilarModal((prev) => ({ ...prev, processingTokenId: null }));
      setInfo(error.message || "Failed to ignore similar case.");
    }
  };

  const handleApplyFix = async (sampleTokenId, patternItem) => {
    if (!sampleTokenId || !patternItem) return;

    const newTag = patternItem?.new_tag;
    if (!newTag) {
      setInfo("No suggested tag available for this pattern.");
      return;
    }

    const tokenIds = [patternItem?.modified_token_id].filter(Boolean);

    if (!tokenIds.length) {
      setInfo("No target token found for fix.");
      return;
    }

    patchFixPanel(sampleTokenId, { applying: true, error: "" });

    try {
      const result = await applyPatternFixSelection(
        {
          token_ids: tokenIds,
          new_tag: newTag,
          pattern: patternItem?.from_pattern || [],
          source_sample_token_id: sampleTokenId,
          verified_by: activeUserId
        },
        projectId
      );

      await Promise.all([loadOverview(), loadSampleQueue(sampleSize)]);
      setFixPanels((prev) => {
        const next = { ...prev };
        delete next[sampleTokenId];
        return next;
      });
      setInfo(result?.message || "Pattern fix applied.");
    } catch (error) {
      patchFixPanel(sampleTokenId, {
        applying: false,
        error: error.message || "Failed to apply fix."
      });
      setInfo(error.message || "Failed to apply fix.");
    }
  };

  const handleIgnoreFix = async (sampleTokenId, patternItem) => {
    if (!sampleTokenId || !patternItem) return;

    try {
      await ignorePatternSuggestion(
        {
          pattern: patternItem?.from_pattern || [],
          source_sample_token_id: sampleTokenId,
          reason: "Ignored in sample review",
          verified_by: activeUserId
        },
        projectId
      );

      setFixPanels((prev) => {
        const current = prev[sampleTokenId] || {};
        const patterns = (current.patterns || []).filter((item) => item.key !== patternItem.key);
        const nextActive = patterns[0]?.key || null;
        return {
          ...prev,
          [sampleTokenId]: {
            ...current,
            patterns,
            activePatternKey: nextActive,
            matchesByKey: current.matchesByKey || {},
            open: true,
            loadingPatterns: false,
            loadingMatches: false,
            applying: false,
            error: ""
          }
        };
      });
      setInfo("Pattern suggestion ignored.");
    } catch (error) {
      patchFixPanel(sampleTokenId, { error: error.message || "Failed to ignore suggestion." });
      setInfo(error.message || "Failed to ignore suggestion.");
    }
  };

  const handleVerifyPreview = async (token) => {
    if (!token?.id) return;

    const selectedTag = editedTags[token.id] || token.tag;
    setPreviewProcessingId(token.id);
    try {
      const result = await verifyPreviewToken(token, selectedTag, projectId, activeUserId);
      await loadOverview();
      setInfo(result?.message || "Preview token verified.");
    } catch (error) {
      setInfo(error.message || "Failed to verify preview token.");
    } finally {
      setPreviewProcessingId(null);
    }
  };

  const handlePreviewRowDoubleClick = (token) => {
    if (!token?.id) return;
    setActiveSection("preview");
    setPreviewSearch("");
    setJumpTokenId(token.id);
    setInfo(`Jumped to original position: sentence ${token.sentence_index ?? "-"}, token ${token.position}.`);
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
                ref={(el) => {
                  if (t.id && el) previewRowRefs.current[t.id] = el;
                }}
                onDoubleClick={() => handlePreviewRowDoubleClick(t)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(130px, auto) minmax(170px, auto) 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  border: highlightPreviewTokenId === t.id ? "2px solid #f59e0b" : "1px solid #e0e6de",
                  borderRadius: 10,
                  background: highlightPreviewTokenId === t.id ? "#fffbeb" : "#fcfdfb",
                  cursor: "pointer"
                }}
              >
                <div style={{ fontWeight: 700 }}>{t.word}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TagDropdown
                    value={(t.id && editedTags[t.id]) || t.tag}
                    onChange={(newTag) => {
                      if (!t.id) return;
                      setEditedTags((prev) => ({ ...prev, [t.id]: newTag }));
                    }}
                  />
                  {(editedTags[t.id] && editedTags[t.id] !== t.tag) && (
                    <span className="small" style={{ color: "#b42318" }}>Modified</span>
                  )}
                </div>
                <div className="small" style={{ textAlign: "right" }}>{renderStatusChip(t.verification_status)}</div>
                <div style={{ textAlign: "right" }}>
                  <button
                    onClick={() => handleVerifyPreview(t)}
                    disabled={previewProcessingId === t.id}
                  >
                    {previewProcessingId === t.id ? "Verifying..." : "Verify"}
                  </button>
                </div>
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
              const panel = tokenId ? fixPanels[tokenId] || {} : {};
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
                            const nextEdited = { ...editedTags, [c.id]: newTag };
                            setEditedTags(nextEdited);

                            if (tokenId && (fixPanels[tokenId] || {}).open) {
                              runFixDetection(item, nextEdited, true);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="controls-row" style={{ marginTop: 12 }}>
                    <button onClick={() => handleCorrect(item)}>Correct</button>
                    <button className="secondary" onClick={() => handleFlag(item)}>Flag</button>
                    <button className="secondary" onClick={() => handleFix(item)}>Fix</button>
                  </div>

                  {panel.open && (
                    <div
                      style={{
                        marginTop: 12,
                        border: "1px solid #f0d2b4",
                        borderRadius: 10,
                        padding: 12,
                        background: "#fffaf5"
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Pattern Suggestion</div>

                      {panel.loadingPatterns && <p className="small">Detecting suspicious patterns...</p>}
                      {!panel.loadingPatterns && panel.error && (
                        <p className="small" style={{ color: "#b42318" }}>{panel.error}</p>
                      )}
                      {!panel.loadingPatterns && !panel.error && (panel.editedSummary || []).length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <p className="small" style={{ marginBottom: 6 }}>Edited / Modified tags</p>
                          <div
                            style={{
                              border: "1px solid #f0e2d2",
                              borderRadius: 8,
                              padding: 8,
                              background: "#fffcf9"
                            }}
                          >
                            {(panel.editedSummary || []).map((edited) => (
                              <div key={edited.id} className="small" style={{ marginBottom: 4 }}>
                                {edited.word}: {edited.from}{" -> "}{edited.to}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {!panel.loadingPatterns && !panel.error && !panel.patterns?.length && (
                        <div style={{ marginTop: 8 }}>
                          <p className="small">No pattern candidate generated from the edited tags yet.</p>
                        </div>
                      )}

                      {!panel.loadingPatterns && (panel.patterns || []).map((patternItem) => {
                        const isActive = panel.activePatternKey === patternItem.key;
                        const matches = (panel.matchesByKey || {})[patternItem.key] || [];
                        const suggestedTag = patternItem?.new_tag || "";
                        return (
                          <div
                            key={patternItem.key}
                            style={{
                              border: "1px solid #f2ddc7",
                              borderRadius: 8,
                              padding: 10,
                              marginTop: 8,
                              background: "#ffffff"
                            }}
                          >
                            <div className="small" style={{ marginBottom: 4 }}>
                              Pattern Detected
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span className="badge" style={{ background: "#fee4e2", border: "1px solid #fecdca", color: "#912018" }}>
                                {(patternItem?.from_pattern || []).join(" -> ")}
                              </span>
                              <span className="small">Suggested</span>
                              <span className="badge" style={{ background: "#dcfae6", border: "1px solid #abefc6", color: "#05603a" }}>
                                {(patternItem?.to_pattern || []).join(" -> ")}
                              </span>
                            </div>
                            <div className="small" style={{ marginTop: 6 }}>{patternItem.reason}</div>

                            <div className="controls-row" style={{ marginTop: 8, gap: 8 }}>
                              <button className="secondary" onClick={() => handleViewSimilarCases(tokenId, patternItem)}>
                                View Similar Cases
                              </button>
                              <button
                                onClick={() => handleApplyFix(tokenId, patternItem)}
                                disabled={panel.applying || !suggestedTag}
                              >
                                Apply Fix (This Sample)
                              </button>
                              <button className="secondary" onClick={() => handleIgnoreFix(tokenId, patternItem)}>
                                Ignore
                              </button>
                            </div>

                            {isActive && panel.loadingMatches && (
                              <div className="small" style={{ marginTop: 8 }}>
                                Loading similar cases...
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {!sampleData.length && <p className="small">No unverified samples available.</p>}
          </div>
        </section>
      )}

      {similarModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.38)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20
          }}
        >
          <div
            style={{
              width: "min(980px, 100%)",
              maxHeight: "85vh",
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #dde6df",
              boxShadow: "0 18px 45px rgba(15, 23, 42, 0.25)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div className="controls-row" style={{ justifyContent: "space-between", padding: 14, borderBottom: "1px solid #e8eee9" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Similar Pattern Cases</div>
                <div className="small">
                  Pattern: {(similarModal.patternItem?.from_pattern || []).join(" -> ")} | Suggested: {(similarModal.patternItem?.to_pattern || []).join(" -> ")}
                </div>
              </div>
              <button className="secondary" onClick={closeSimilarModal}>Close</button>
            </div>

            <div style={{ padding: 14, overflowY: "auto" }}>
              {similarModal.loading && <p className="small">Loading all matching cases...</p>}

              {!similarModal.loading && !similarModal.matches.length && (
                <p className="small">No similar cases found.</p>
              )}

              {!similarModal.loading && similarModal.matches.length > 0 && (
                <>
                  <div className="small" style={{ marginBottom: 10 }}>Found {similarModal.matches.length} cases</div>
                  {similarModal.matches.map((match, idx) => {
                    const tokenId = match?.target_token_id;
                    const processing = similarModal.processingTokenId === tokenId;
                    return (
                      <div
                        key={`${tokenId || idx}-${idx}`}
                        style={{
                          border: "1px solid #e3ece5",
                          borderRadius: 10,
                          padding: 10,
                          marginBottom: 8,
                          background: "#fcfefc"
                        }}
                      >
                        <div className="small" style={{ marginBottom: 6 }}>
                          {(match?.words || []).join(" ")} | {(match?.tags || []).join(" -> ")}
                        </div>
                        <div className="controls-row" style={{ gap: 8 }}>
                          <button onClick={() => handleApplySimilarCase(match)} disabled={processing}>
                            {processing ? "Applying..." : "Apply"}
                          </button>
                          <button className="secondary" onClick={() => handleIgnoreSimilarCase(match)} disabled={processing}>
                            Ignore
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
