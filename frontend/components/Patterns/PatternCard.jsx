export default function PatternCard({ item, onApplyFix }) {
  const words = item.sequence || [];
  const tags = item.tags || [];
  const suggested = item.suggested || [];

  return (
    <article className="card">
      <p>
        <strong>Detected:</strong>{" "}
        {words.map((w, i) => (
          <span key={`w-${i}`} style={{ marginRight: 12 }}>
            [{w} {tags[i] || ""}]
          </span>
        ))}
      </p>
      <p>
        <strong>Suggested:</strong>{" "}
        {words.map((w, i) => (
          <span key={`s-${i}`} style={{ marginRight: 12 }}>
            [{w} {suggested[i] || tags[i] || ""}]
          </span>
        ))}
      </p>
      <button onClick={() => onApplyFix(item)}>Apply Fix</button>
    </article>
  );
}
