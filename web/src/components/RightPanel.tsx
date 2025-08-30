import React, { useMemo, useState } from "react";
import { Card, Tag } from "./Shell";
import type { SymptomData } from "./SymptomForm";

export default function RightPanel({ symptoms, lastScore, cues }:{
  symptoms: SymptomData | null; lastScore: number; cues: string[];
}) {
  const [tab, setTab] = useState<"screen"|"plan"|"posture"|"alternatives">("screen");

  return (
    <div style={{ display:"grid", gap: 12 }}>
      <div style={{ display:"flex", gap:8 }}>
        {["screen","plan","posture","alternatives"].map(t=>(
          <button key={t} onClick={()=>setTab(t as any)} style={{
            padding:"6px 10px", borderRadius:8, border:"1px solid #ddd",
            background: tab===t ? "#111" : "#fff", color: tab===t ? "#fff":"#111"
          }}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab==="screen"   && <ScreeningCard symptoms={symptoms} lastScore={lastScore} cues={cues} />}
      {tab==="plan"     && <PlanCard symptoms={symptoms} />}
      {tab==="posture"  && <PostureCard />}
      {tab==="alternatives" && <AltTherapiesCard />}
      <Disclaimer />
    </div>
  );
}

function ScreeningCard({ symptoms, lastScore, cues }:{ symptoms: SymptomData | null; lastScore: number; cues: string[] }) {
  const result = useMemo(()=>{
    if (!symptoms) return null;
    const red = symptoms.bladderBowel || symptoms.numbness || symptoms.fever || symptoms.trauma;
    const acute = symptoms.durationDays < 6*7; // <6 weeks
    const severity = symptoms.painWorst >= 8;

    if (red) return { tone: "bad", label: "See a clinician urgently",
      notes: ["One or more red flags selected.", "Seek medical assessment before continuing exercise."] };

    if (severity) return { tone: "warn", label: "High pain — go gentle",
      notes: ["Use gentle mobility only, keep sessions short.", "If pain persists/worsens, contact a clinician."] };

    return { tone: "good", label: acute ? "Likely simple mechanical back pain" : "Persistent back pain pattern",
      notes: acute
        ? ["Try daily gentle mobility + light core work.", "Gradually increase activity; avoid prolonged rest."]
        : ["Consider consistent graded activity + stress/sleep support.", "Book a non-urgent physio/PCP visit for a plan."] };
  }, [symptoms]);

  const suggestions = useMemo(()=>{
    // Map cues & symptoms to stretch/exercise lists
    const baseStretches = ["Cat–Cow (2 min)", "Child’s Pose to Side Stretch (1 min/side)", "Knee-to-Chest (1 min)"];
    const extension = ["Sphinx → Cobra (2–3 min easy range)"];
    const hingePattern = ["Hip Hinge Patterning (2×8 slow reps)"];
    const core = ["Dead Bug (2×8 slow)", "Bird-Dog (2×8/side)", "Side Plank (2×20–30s/side)"];
    const longSits = symptoms?.deskHours && symptoms.deskHours >= 6;

    return {
      stretches: symptoms?.location==="low" ? [...baseStretches, ...extension] : baseStretches,
      exercises: [...core, ...(lastScore<60 ? hingePattern : [])],
      habits: [
        longSits ? "Stand or walk 2–3 min every 30–45 min" : "Keep moving gently through the day",
        "Aim 7–9h sleep; manage stress (breathing 5 min)"
      ],
      videoNotes: cues.slice(0,2)
    };
  }, [symptoms, cues, lastScore]);

  return (
    <Card title="Screening & Suggestions">
      {!symptoms ? <div>Fill in the Symptoms form to personalize suggestions.</div> :
        <>
          <div style={{ marginBottom:8 }}>
            <Tag tone={result?.tone as any}>{result?.label}</Tag>
            {result?.notes.map((n,i)=><div key={i} style={{ fontSize: 13, color:"#444" }}>• {n}</div>)}
          </div>

          <div style={{ marginTop:8 }}>
            <div style={{ fontWeight:700, marginBottom:4 }}>Suggested stretches</div>
            <ul style={{ marginTop:0 }}>
              {suggestions.stretches.map((s,i)=><li key={i}>{s}</li>)}
            </ul>
            <div style={{ fontWeight:700, marginBottom:4 }}>Core/back exercises</div>
            <ul style={{ marginTop:0 }}>
              {suggestions.exercises.map((s,i)=><li key={i}>{s}</li>)}
            </ul>
            <div style={{ fontWeight:700, marginBottom:4 }}>Daily habits</div>
            <ul style={{ marginTop:0 }}>
              {suggestions.habits.map((s,i)=><li key={i}>{s}</li>)}
            </ul>
            {suggestions.videoNotes.length>0 && (
              <>
                <div style={{ fontWeight:700, marginTop:8, marginBottom:4 }}>From your form check</div>
                <ul style={{ marginTop:0 }}>{suggestions.videoNotes.map((c,i)=><li key={i}>{c}</li>)}</ul>
              </>
            )}
          </div>
        </>
      }
    </Card>
  );
}

function PlanCard({ symptoms }:{ symptoms: SymptomData | null }) {
  const acute = symptoms ? symptoms.durationDays < 42 : true;
  return (
    <Card title="Recovery & Treatment Plan (general)">
      <div style={{ fontSize: 14, color:"#333", display:"grid", gap:8 }}>
        <div><b>Week 1–2:</b> gentle mobility daily (5–10 min), short walks, pain-free ranges only.</div>
        <div><b>Week 3–4:</b> add core work 3×/week, gradually return to usual activity.</div>
        <div><b>Relief options:</b> heat 10–20m; OTC analgesics/anti-inflammatories <i>only per label or clinician</i>.</div>
        <div><b>When to seek care:</b> if pain is severe, not improving after 2–4 weeks, or any red flags (numbness/weakness, bladder/bowel issues, fever, trauma).</div>
        <div><b>Imaging/surgery:</b> usually not first-line for simple back pain. Discuss with a clinician if pain persists or neurological signs appear.</div>
      </div>
    </Card>
  );
}

function PostureCard() {
  return (
    <Card title="Posture & Daily Habits">
      <ul style={{ marginTop:0 }}>
        <li><b>Sitting:</b> hips slightly higher than knees; back supported; screen at eye level; stand 2–3 min every 30–45 min.</li>
        <li><b>Standing:</b> even weight on both feet; soften knees; ribcage over pelvis; change stance often.</li>
        <li><b>Lifting:</b> keep load close; hinge at hips; exhale on effort; avoid twisting with heavy loads.</li>
        <li><b>Sleep:</b> side with pillow between knees, or back with pillow under knees; aim 7–9 hours.</li>
        <li><b>Micro-breaks:</b> 3–5× per day: shoulder rolls, gentle spinal mobility, short walk.</li>
      </ul>
    </Card>
  );
}

function AltTherapiesCard() {
  return (
    <Card title="Alternative & Adjunct Options (discuss with a clinician)">
      <ul style={{ marginTop:0 }}>
        <li><b>Physiotherapy</b> (exercise-based rehab, manual therapy)</li>
        <li><b>Chiropractic</b> (spinal manipulation; mixed evidence; may help short-term for some)</li>
        <li><b>Acupuncture</b> (some people report relief; evidence varies)</li>
        <li><b>Shockwave therapy</b> (more for tendinopathies; discuss suitability)</li>
        <li><b>Traditional Chinese medicine</b> (herbal remedies, cupping; ensure qualified practitioner & discuss interactions)</li>
        <li><b>Mind-body</b> (breathing, CBT techniques, stress management)</li>
      </ul>
      <div style={{ fontSize:13, color:"#555" }}>Note: effectiveness varies by person and condition. Use credentialed providers and coordinate with your primary clinician.</div>
    </Card>
  );
}

function Disclaimer() {
  return (
    <Card title="Important">
      <div style={{ fontSize: 13, color:"#444" }}>
        This app provides general education and exercise guidance and is <b>not a medical diagnosis</b>. 
        If you have red-flag symptoms, severe pain, or symptoms that don’t improve, contact a qualified clinician.
        Do not start/stop medication without professional advice. Always follow medication labels and your clinician’s instructions.
      </div>
    </Card>
  );
}
