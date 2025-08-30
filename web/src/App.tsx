import React, { useRef, useState } from "react";
import Shell from "./components/Shell";
import PoseCoach from "./components/PoseCoach";
import SymptomForm, { type SymptomData } from "./components/SymptomForm";

import RightPanel from "./components/RightPanel";

export default function App() {
  // Create a small bridge: we'll let PoseCoach update these via refs or callbacks.
  const [lastScore, setLastScore] = useState(0);
  const [cues, setCues] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomData | null>(null);

  // Wrap PoseCoach and intercept score/cues: simple prop-drilling via a wrapper
  const CoachWithTap = () => {
    // We’ll patch PoseCoach to call window._poseTap when it updates (quick hack to avoid modifying its props)
    (window as any)._poseTap = (score: number, cues: string[]) => {
      setLastScore(score);
      setCues(cues);
    };
    return <PoseCoach />;
  };

  return (
    <Shell
      left={<CoachWithTap />}
      right={
        <>
          <SymptomForm onChange={setSymptoms} />
          <RightPanel symptoms={symptoms} lastScore={lastScore} cues={cues} />
        </>
      }
    />
  );
}
