import React from "react";

export const Campo = ({ T, label, children, className = "" }) => (
  <div className={`mb-3.5 ${className}`}>
    <div style={{ fontSize: 12.5, color: T.muted, fontWeight: 500, marginBottom: 6 }}>
      {label}
    </div>
    {children}
  </div>
);
