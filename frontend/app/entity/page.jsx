"use client";

import { useState } from "react";
import { getEntityOccurrences, bulkUpdateEntity } from "../../lib/api";
import TagDropdown from "../../components/Common/TagDropdown";
import ContextViewer from "../../components/Sampling/ContextViewer";

export default function EntityPage() {
  const [word, setWord] = useState("");
  const [tag, setTag] = useState("B-PER");
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Search a token/entity to bulk-edit all occurrences.");

  const handleSearch = async () => {
    if (!word.trim()) {
      setStatus("Enter an entity word.");
      return;
    }

    try {
      const data = await getEntityOccurrences(word.trim());
      const items = data?.items || data || [];
      setRows(items);
      setStatus(`Found ${items.length} occurrences.`);
    } catch (error) {
      setStatus(error.message || "Entity search failed.");
    }
  };

  const handleApply = async () => {
    if (!word.trim()) {
      setStatus("Enter an entity word first.");
      return;
    }

    try {
      await bulkUpdateEntity(word.trim(), tag);
      setStatus(`Applied ${tag} to all '${word.trim()}' tokens.`);
    } catch (error) {
      setStatus(error.message || "Bulk entity update failed.");
    }
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>Entity Bulk Correction</h2>
        <div className="controls-row">
          <input
            placeholder="Enter entity word (e.g. രാഹുൽ)"
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />
          <button onClick={handleSearch}>Find Occurrences</button>
          <TagDropdown value={tag} onChange={setTag} />
          <button className="warn" onClick={handleApply}>Apply to All</button>
        </div>
      </section>

      <section className="card">
        <h3>Occurrences</h3>
        <div className="list">
          {rows.map((row, idx) => (
            <div className="card" key={`${row.sentence_id}-${row.position}-${idx}`}>
              <div className="small">Sentence {row.sentence_id} | Position {row.position}</div>
              <ContextViewer context={row.context || []} targetPosition={row.position} />
            </div>
          ))}
          {!rows.length && <p className="small">No occurrences loaded.</p>}
        </div>
      </section>

      <section className="card">
        <h3>Status</h3>
        <p>{status}</p>
      </section>
    </div>
  );
}
