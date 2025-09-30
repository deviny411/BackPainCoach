import React, { useState } from "react";
import { Card } from "./Shell";

export type SymptomData = {
  painNow: number; painWorst: number; location: "low"|"mid"|"upper";
  durationDays: number; numbness: boolean; fever: boolean; bladderBowel: boolean; trauma: boolean;
  deskHours: number; sleepHours: number; stress: "low"|"med"|"high";
};

export default function SymptomForm({ onChange }: { onChange: (s: SymptomData) => void }) {
  const [s, setS] = useState<SymptomData>({
    painNow: 3, painWorst: 6, location: "low", durationDays: 7,
    numbness: false, fever: false, bladderBowel: false, trauma: false,
    deskHours: 6, sleepHours: 7, stress: "med"
  });

  const update = (patch: Partial<SymptomData>) => {
    const next = { ...s, ...patch };
    setS(next);
    onChange(next);
  };

  return (
    <Card title="Symptoms">
      <div style={{ display: "grid", gap: 10 }}>
        <label>Current pain (0–10): <input type="range" min={0} max={10} value={s.painNow}
          onChange={(e)=>update({ painNow: parseInt(e.target.value) })}/> <b>{s.painNow}</b></label>
        <label>Worst pain last 24h: <input type="range" min={0} max={10} value={s.painWorst}
          onChange={(e)=>update({ painWorst: parseInt(e.target.value) })}/> <b>{s.painWorst}</b></label>

        <label>Location:
          <select value={s.location} onChange={(e)=>update({ location: e.target.value as any })}>
            <option value="low">Low back</option><option value="mid">Mid back</option><option value="upper">Upper/neck</option>
          </select>
        </label>

        <label>Duration (days): <input type="number" min={0} value={s.durationDays}
          onChange={(e)=>update({ durationDays: parseInt(e.target.value||"0") })}/></label>

        <fieldset style={{ border: "1px dashed #ddd", borderRadius: 8, padding: 8 }}>
          <legend style={{ padding: "0 6px" }}>Any red flags?</legend>
          <label><input type="checkbox" checked={s.numbness} onChange={(e)=>update({ numbness: e.target.checked })}/> Numbness/weakness in legs</label><br/>
          <label><input type="checkbox" checked={s.fever} onChange={(e)=>update({ fever: e.target.checked })}/> Fever/unwell</label><br/>
          <label><input type="checkbox" checked={s.bladderBowel} onChange={(e)=>update({ bladderBowel: e.target.checked })}/> Bladder/bowel changes</label><br/>
          <label><input type="checkbox" checked={s.trauma} onChange={(e)=>update({ trauma: e.target.checked })}/> Recent trauma</label>
        </fieldset>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 10 }}>
          <label>Desk hours/day <input type="number" min={0} value={s.deskHours} onChange={(e)=>update({ deskHours: parseInt(e.target.value||"0") })}/></label>
          <label>Sleep hours <input type="number" min={0} value={s.sleepHours} onChange={(e)=>update({ sleepHours: parseInt(e.target.value||"0") })}/></label>
          <label>Stress
            <select value={s.stress} onChange={(e)=>update({ stress: e.target.value as any })}>
              <option>low</option><option>med</option><option>high</option>
            </select>
          </label>
        </div>
      </div>
    </Card>
  );
}
