import React from "react";

export const IconBtn = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`p-1.5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors duration-150 ${className}`}
    style={{ color: "#C9C4C0", borderRadius: 8 }}
  >
    {children}
  </button>
);
