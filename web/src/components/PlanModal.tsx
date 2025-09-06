import React, { useMemo, useState } from "react";
import Modal from "./Modal";
import { Card, Tag } from "./Shell";
import SymptomForm, { type SymptomData } from "./SymptomForm";

export type SessionItem = { kind: "stretch" | "exercise"; name: string; durationSec?: number; reps?: number; side?: "left"|"right"|"both"; };

export default function PlanModal({
  open, onClose, lastScore, cues, onUsePlan
}: {
  open: boolean; onClose: () => void; lastScore: number; cues: string[];
  onUsePlan: (items: SessionItem[]) => void;
}) {
  const [symptoms, setSymptoms] = useState<SymptomData | null>(null);

  const screen = useMemo(()=>{
    if (!symptoms) return null;
    const red = symptoms.bladderBowel || symptoms.numbness || symptoms.fever || symptoms.trauma;
    const acute = symptoms.durationDays < 42;
    const severity = symptoms.painWorst >= 8;
    if (red) return { tone:"bad", label:"See a clinician urgently", notes:["Red flags selected. Seek medical assessment."] };
    if (severity) return { tone:"warn", label:"High pain — go gentle", notes:["Short, gentle mobility only. If worsening, contact a clinician."] };
    return { tone:"good", label: acute ? "Likely simple mechanical back pain" : "Persistent back pain pattern",
      notes: acute ? ["Daily gentle mobility + light core.", "Avoid long rest; keep moving within comfort."]
                   : ["Consistent graded activity + stress/sleep support.", "Consider non-urgent physio/PCP visit."] };
  }, [symptoms]);

  const suggestions = useMemo(()=>{
    const baseStretches = [
      { kind:"stretch", name:"Cat–Cow", durationSec:120 },
      { kind:"stretch", name:"Knee-to-Chest", durationSec:60 },
    ] as SessionItem[];
    const extension = symptoms?.location==="low" ? [{ kind:"stretch", name:"Sphinx → Cobra", durationSec:120 } as SessionItem] : [];
    const core = [
      { kind:"exercise", name:"Dead Bug", reps:8 },
      { kind:"exercise", name:"Bird-Dog", reps:8 },
      { kind:"exercise", name:"Side Plank (each)", durationSec:25 },
    ] as SessionItem[];
    const hingeFix = lastScore < 60 ? [{ kind:"exercise", name:"Hip Hinge Patterning", reps:8 } as SessionItem] : [];
    return { stretches:[...baseStretches, ...extension], exercises:[...core, ...hingeFix] };
  }, [symptoms, lastScore]);

  const planFooter = (
    <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
      <button onClick={onClose}>Cancel</button>
      <button
        onClick={()=>{
          const session = [...suggestions.stretches, ...suggestions.exercises];
          onUsePlan(session);
          onClose();
        }}
        style={{ background:"#111", color:"#fff", borderRadius:8, padding:"8px 12px" }}
      >
        Use this plan
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Generate a Plan" footer={planFooter}>
      <div style={{ display:"grid", gap:12 }}>
        <SymptomForm onChange={setSymptoms} />
        <Card title="Screening">
          {!symptoms ? <div>Fill in symptoms to personalize.</div> :
            <>
              <Tag tone={screen?.tone as any}>{screen?.label}</Tag>
              {screen?.notes.map((n,i)=><div key={i} style={{ fontSize:13, color:"#444" }}>• {n}</div>)}
            </>
          }
        </Card>
        <Card title="Suggested session (what you’ll run on the left)">
          <div style={{ display:"grid", gap:6 }}>
            <div><b>Stretches</b></div>
            <ul style={{ marginTop:0 }}>
              {suggestions.stretches.map((s,i)=><li key={i}>{s.name} {s.durationSec?`— ${s.durationSec}s`:s.reps?`— ${s.reps} reps`:""}</li>)}
            </ul>
            <div><b>Core / Back</b></div>
            <ul style={{ marginTop:0 }}>
              {suggestions.exercises.map((s,i)=><li key={i}>{s.name} {s.durationSec?`— ${s.durationSec}s`:s.reps?`— ${s.reps} reps`:""}</li>)}
            </ul>
            <div style={{ fontSize:12, color:"#777" }}>Note: This is general education, not medical advice. Seek care for severe/persistent symptoms or any red flags.</div>
          </div>
        </Card>
      </div>
    </Modal>
  );
}
