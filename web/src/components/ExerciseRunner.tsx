import React, { useEffect, useMemo, useState } from "react";
import PoseCoach from "./PoseCoach";
import type { SessionItem } from "./PlanModal";
import { Card } from "./Shell";

function mapToPoseMode(name: string): "hinge"|"plank"|null {
  const n = name.toLowerCase();
  if (n.includes("hinge")) return "hinge";
  if (n.includes("plank")) return "plank";
  return null; // not tracked by vision yet
}

export default function ExerciseRunner({
  session, onUpdate
}: {
  session: SessionItem[];
  onUpdate?: (score: number, cues: string[]) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<"hinge"|"plank"|"none">("none");
  const [score, setScore] = useState(0);
  const [cues, setCues] = useState<string[]>([]);
  const item = session[idx];

  useEffect(() => {
    const m = item ? mapToPoseMode(item.name) : null;
    setMode(m ?? "none");
  }, [idx, item]);

  useEffect(() => { onUpdate?.(score, cues); }, [score, cues, onUpdate]);

  const instructions = useMemo(()=>{
    if (!item) return [];
    const lines: string[] = [];
    if (item.kind === "stretch") {
      lines.push("Move gently in a comfortable range. Breathe slowly.");
      if (item.name.toLowerCase().includes("cobra")) lines.push("Stop if you feel sharp leg pain or tingling.");
      if (item.durationSec) lines.push(`Timer: ${item.durationSec}s`);
    } else {
      if (item.name.toLowerCase().includes("hinge")) lines.push("Keep shins vertical, hinge at hips, spine long.");
      if (item.name.toLowerCase().includes("plank")) lines.push("Ribs down, hips level, press floor away.");
      if (item.reps) lines.push(`Target: ${item.reps} slow reps`);
      if (mode === "none") lines.push("Tip: This item isn’t vision-tracked yet—follow the cues above.");
    }
    return lines;
  }, [item, mode]);

  if (!item) {
    return (
      <Card title="Ready">
        <div>No session loaded. Click “Generate Plan” and then “Use this plan”.</div>
      </Card>
    );
  }

  return (
    <div style={{ display:"grid", gap: 12 }}>
      <Card title={`Now: ${item.name}`}>
        <div style={{ fontSize:14, color:"#333" }}>
          {instructions.map((t,i)=><div key={i}>• {t}</div>)}
        </div>
        <div style={{ marginTop:8, fontSize:13, color:"#666" }}>
          {mode !== "none" ? <>Live form score appears over the video.</> : <>This step is guided with text.</>}
        </div>
      </Card>

      {mode !== "none" ? (
        <PoseCoach
          mode={mode as "hinge"|"plank"}
          onUpdate={(s, c)=>{ setScore(s); setCues(c); }}
        />
      ) : (
        <div style={{
          height: 360, display:"grid", placeItems:"center",
          borderRadius: 12, border:"1px dashed #ccc", color:"#666"
        }}>
          (Stretch / non-tracked move)
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button onClick={()=>setIdx(Math.max(0, idx-1))} disabled={idx===0}>← Prev</button>
        <div>Step {idx+1} / {session.length}</div>
        <button onClick={()=>setIdx(Math.min(session.length-1, idx+1))} disabled={idx===session.length-1}>Next →</button>
      </div>
    </div>
  );
}
