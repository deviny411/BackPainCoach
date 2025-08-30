import React from "react";

export default function Shell({ left, right }: { left: React.ReactNode; right: React.ReactNode; }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(620px, 1fr) 420px",
      gap: 16,
      margin: "16px auto",
      maxWidth: 1200,
      padding: "0 12px",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 8px 28px rgba(0,0,0,.08)",
      border: "1px solid #eee",
      padding: 14
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

export function Tag({ children, tone="neutral" }: { children: React.ReactNode; tone?: "good"|"warn"|"bad"|"neutral"}) {
  const colors: Record<string, string> = {
    good: "#e8f7ee", warn: "#fff6e0", bad: "#fdecec", neutral: "#f2f4f7"
  };
  const text: Record<string, string> = {
    good: "#0f8a4b", warn: "#8a6a0f", bad: "#a10f0f", neutral: "#333"
  };
  return (
    <span style={{
      background: colors[tone], color: text[tone], borderRadius: 999, padding: "4px 10px",
      fontSize: 12, marginRight: 6, display: "inline-block"
    }}>{children}</span>
  );
}
