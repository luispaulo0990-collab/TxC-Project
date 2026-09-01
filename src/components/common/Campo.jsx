import React from "react";

export const Campo = ({ T, label, children, className = "" }) => (
  <div className={`mb-3.5 ${className}`}>
    <div style={{ fontSize: 9.5, letterSpacing: 1.1, color: T.dim, fontWeight: 700, marginBottom: 6 }}>
      {label.toUpperCase()}
    </div>
    {children}
  </div>
);
