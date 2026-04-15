import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px" }}>{children}</div>;
}
