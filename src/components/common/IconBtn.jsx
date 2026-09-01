import React from "react";

export const IconBtn = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`p-1.5 flex items-center justify-center hover:bg-white/10 rounded transition-colors duration-150 ${className}`}
    style={{ color: "rgba(255,255,255,0.75)" }}
  >
    {children}
  </button>
);
