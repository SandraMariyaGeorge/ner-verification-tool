export default function ContextViewer({ context, targetPosition }) {
  if (!context?.length) {
    return <div className="small">No context available.</div>;
  }

  return (
    <p className="context">
      {context.map((token, idx) => {
        const isTarget = token.position === targetPosition;
        return (
          <span key={`${token.position}-${idx}`} className={isTarget ? "highlight" : ""}>
            {token.word}{" "}
          </span>
        );
      })}
    </p>
  );
}
