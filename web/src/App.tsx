import React from "react";
import ExerciseTracker from "./components/ExerciseTracker";

export default function App() {
  return (
    <div style={{ 
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      maxWidth: 1200,
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: 20,
        color: '#333'
      }}>
        Back Pain Exercise Coach
      </h1>
      <ExerciseTracker />
    </div>
  );
}
