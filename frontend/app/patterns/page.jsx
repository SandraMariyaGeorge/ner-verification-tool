"use client";

import { useState } from "react";
import PatternList from "../../components/Patterns/PatternList";
import { getPatternErrors, applyPatternFix } from "../../lib/api";

export default function PatternPage() {
  const [patterns, setPatterns] = useState([]);
  const [status, setStatus] = useState("Click detect errors to scan BIO tag inconsistencies.");
  const [loading, setLoading] = useState(false);

  const handleDetect = async () => {
    setLoading(true);
    try {
      const data = await getPatternErrors();
      const items = data?.items || data || [];
      setPatterns(items);
      setStatus(`Found ${items.length} candidate pattern errors.`);
    } catch (error) {
      setStatus(error.message || "Pattern detection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = async (item) => {
    try {
      await applyPatternFix(item);
      setStatus("Applied pattern fix.");
      setPatterns((prev) => prev.filter((p) => p !== item));
    } catch (error) {
      setStatus(error.message || "Pattern fix failed.");
    }
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>Pattern Error Detection</h2>
        <div className="controls-row">
          <button onClick={handleDetect} disabled={loading}>{loading ? "Scanning..." : "Detect Errors"}</button>
        </div>
      </section>

      <section className="card">
        <PatternList items={patterns} onApplyFix={handleApplyFix} />
      </section>

      <section className="card">
        <h3>Status</h3>
        <p>{status}</p>
      </section>
    </div>
  );
}
