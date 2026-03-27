import ContextViewer from "../Sampling/ContextViewer";

export default function BulkEditModal({ open, word, newTag, rows, onClose, onApply }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h3>Apply this change to all "{word}"?</h3>
        <p className="small">Occurrences: {rows?.length || 0} | New tag: <strong>{newTag}</strong></p>

        <div className="list" style={{ margin: "12px 0" }}>
          {(rows || []).slice(0, 25).map((row, idx) => (
            <div className="card" key={`${row.sentence_id}-${row.position}-${idx}`}>
              <div className="small">Sentence {row.sentence_id} | Position {row.position}</div>
              <ContextViewer context={row.context || []} targetPosition={row.position} />
            </div>
          ))}
        </div>

        <div className="controls-row">
          <button onClick={onApply}>Yes, Apply to All</button>
          <button className="secondary" onClick={onClose}>No, Keep Single Change</button>
        </div>
      </div>
    </div>
  );
}
