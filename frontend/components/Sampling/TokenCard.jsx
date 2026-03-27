import TagDropdown from "../Common/TagDropdown";
import ContextViewer from "./ContextViewer";

function getTagClass(tag) {
  if (tag?.includes("PER")) return "tag-per";
  if (tag?.includes("LOC")) return "tag-loc";
  if (tag?.includes("ORG")) return "tag-org";
  return "tag-o";
}

export default function TokenCard({ item, onTagChange }) {
  return (
    <article className="card">
      <div className="controls-row" style={{ justifyContent: "space-between" }}>
        <span className="badge">Sentence {item.sentence_id} | Position {item.position}</span>
        <span className={getTagClass(item.tag)}><strong>{item.tag}</strong></span>
      </div>

      <div style={{ margin: "10px 0" }}>
        <ContextViewer context={item.context || []} targetPosition={item.position} />
      </div>

      <div className="controls-row">
        <span className="small">Update Tag</span>
        <TagDropdown value={item.tag} onChange={(v) => onTagChange(item, v)} />
      </div>
    </article>
  );
}
