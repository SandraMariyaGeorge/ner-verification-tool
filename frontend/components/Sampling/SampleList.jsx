import TokenCard from "./TokenCard";

export default function SampleList({ items, onTagChange }) {
  if (!items?.length) {
    return <p className="small">No sampled data yet.</p>;
  }

  return (
    <div className="list">
      {items.map((item, idx) => (
        <TokenCard key={`${item.sentence_id}-${item.position}-${idx}`} item={item} onTagChange={onTagChange} />
      ))}
    </div>
  );
}
