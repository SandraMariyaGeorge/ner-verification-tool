const TAGS = [
  "B-PER", "I-PER",
  "B-ORG", "I-ORG",
  "B-LOC", "I-LOC",
  "B-CARDINAL", "I-CARDINAL",
  "B-ORDINAL", "I-ORDINAL",
  "O"
];

export default function TagDropdown({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {TAGS.map((tag) => (
        <option key={tag} value={tag}>{tag}</option>
      ))}
    </select>
  );
}
