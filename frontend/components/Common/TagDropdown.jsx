const TAGS = ["B-PER", "I-PER", "B-LOC", "I-LOC", "B-ORG", "I-ORG", "O"];

export default function TagDropdown({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {TAGS.map((tag) => (
        <option key={tag} value={tag}>{tag}</option>
      ))}
    </select>
  );
}
