"use client";

import { useState } from "react";
import SampleControls from "../../components/Sampling/SampleControls";
import SampleList from "../../components/Sampling/SampleList";
import BulkEditModal from "../../components/Entity/BulkEditModal";
import { getSample, updateSingleTag, getEntityOccurrences, bulkUpdateEntity, getPreview } from "../../lib/api";

export default function SamplingPage() {
  const [sampleData, setSampleData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("Generate sample to review random tokens with context.");
  const [bulkState, setBulkState] = useState({ open: false, word: "", newTag: "", rows: [] });

  const handleGenerateSample = async (size) => {
    setLoading(true);
    try {
      const [sample, preview] = await Promise.all([getSample(size), getPreview(25)]);
      setSampleData(sample?.items || sample || []);
      setPreviewData(preview?.items || preview || []);
      setInfo(`Loaded sample size ${size}.`);
    } catch (error) {
      setInfo(error.message || "Failed to load sample.");
    } finally {
      setLoading(false);
    }
  };

  const handleTagChange = async (token, newTag) => {
    try {
      await updateSingleTag(token, newTag);
      setSampleData((prev) => prev.map((item) => (
        item.sentence_id === token.sentence_id && item.position === token.position
          ? { ...item, tag: newTag }
          : item
      )));

      const rows = await getEntityOccurrences(token.word);
      setBulkState({ open: true, word: token.word, newTag, rows: rows?.items || rows || [] });
    } catch (error) {
      setInfo(error.message || "Tag update failed.");
    }
  };

  const handleApplyToAll = async () => {
    try {
      await bulkUpdateEntity(bulkState.word, bulkState.newTag);
      setInfo(`Applied ${bulkState.newTag} to all occurrences of ${bulkState.word}.`);
      setBulkState((prev) => ({ ...prev, open: false }));
    } catch (error) {
      setInfo(error.message || "Bulk update failed.");
    }
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>Dataset Preview + Sampling</h2>
        <SampleControls onGenerate={handleGenerateSample} loading={loading} />
      </section>

      <section className="card">
        <h3>Preview (first 25 tokens)</h3>
        <div className="small">{previewData.length ? `${previewData.length} tokens loaded` : "No preview yet"}</div>
        <div className="list" style={{ marginTop: 10 }}>
          {previewData.map((t, idx) => (
            <div key={`${t.sentence_id}-${t.position}-${idx}`} className="small">
              {t.word} <strong>{t.tag}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Sampled Tokens</h3>
        <SampleList items={sampleData} onTagChange={handleTagChange} />
      </section>

      <section className="card">
        <h3>Status</h3>
        <p>{info}</p>
      </section>

      <BulkEditModal
        open={bulkState.open}
        word={bulkState.word}
        newTag={bulkState.newTag}
        rows={bulkState.rows}
        onClose={() => setBulkState((prev) => ({ ...prev, open: false }))}
        onApply={handleApplyToAll}
      />
    </div>
  );
}
