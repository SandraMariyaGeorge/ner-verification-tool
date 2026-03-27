import PatternCard from "./PatternCard";

export default function PatternList({ items, onApplyFix }) {
  if (!items?.length) {
    return <p className="small">No pattern issues loaded.</p>;
  }

  return (
    <div className="list">
      {items.map((item, idx) => (
        <PatternCard key={`${item.sentence_id || idx}-${idx}`} item={item} onApplyFix={onApplyFix} />
      ))}
    </div>
  );
}
