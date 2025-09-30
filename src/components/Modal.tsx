import React, { useEffect } from "react";

export default function Modal({
  open, onClose, title, children, footer
}: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "grid", placeItems: "center", zIndex: 9999
    }} onClick={onClose}>
      <div onClick={(e)=>e.stopPropagation()} style={{
        width: "min(880px, 92vw)", maxHeight: "90vh", overflow: "auto",
        background: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.3)", padding: 16
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div>{children}</div>
        {footer && <div style={{ marginTop: 12 }}>{footer}</div>}
      </div>
    </div>
  );
}
