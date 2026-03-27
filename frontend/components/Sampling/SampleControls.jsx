"use client";

import { useState } from "react";

export default function SampleControls({ onGenerate, loading }) {
  const [size, setSize] = useState(100);

  return (
    <div className="controls-row">
      <label htmlFor="sample-size" className="small">Sample Size</label>
      <input
        id="sample-size"
        type="number"
        min="1"
        max="5000"
        value={size}
        onChange={(e) => setSize(Number(e.target.value) || 1)}
      />
      <button onClick={() => onGenerate(size)} disabled={loading}>Generate Sample</button>
    </div>
  );
}
