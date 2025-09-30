# BackPainCoach

BackPainCoach is a React + TypeScript + TensorFlow.js application that helps users **manage and understand back pain** through guided mobility, core exercises, posture assessment, and symptom-based plan generation.

It combines **real-time pose detection** with a **clinical-style screening form** to provide safe, personalized guidance.

---

## ✨ Features

- **🔍 Symptom Screening**
  - Form for pain level, duration, location, lifestyle factors (desk hours, sleep, stress).
  - Identifies *red flags* (e.g. numbness, trauma, fever, bladder/bowel changes).
  - Provides recommendations: urgent care, go-gentle, or safe to proceed.

- **📋 Personalized Plan**
  - Generates a session with stretches, core exercises, and daily habit suggestions.
  - Adapts based on pain severity, duration, and last exercise score.

- **🎥 Real-Time Form Coaching**
  - Uses [TensorFlow.js MoveNet](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection) to track posture.
  - Supports **hip hinge** and **plank** scoring out of the box (extendable with new exercises).
  - Live cues appear on screen (e.g. “hips too high”, “spine not neutral”).

- **📊 Right Panel Guidance**
  - Tabs for screening results, recovery plan, posture advice, and alternative therapies.
  - Education on sitting, lifting, sleep positions, and adjunct treatments.

- **⚠️ Disclaimers Built-In**
  - Clear messaging: this is *not* a diagnosis, only education + exercise guidance.
  - Reminders to seek professional care for red flags or severe/persistent symptoms.

---

## 🛠 Tech Stack

- **React + TypeScript** – UI + type safety
- **Vite** – fast dev environment
- **TensorFlow.js + MoveNet** – real-time pose detection
- **Inline Styling** – simple responsive UI with cards, modals, and panels

---

## 📂 Key Files

- `PoseCoach.tsx` – Camera setup, pose detection, scoring, canvas overlay with scores + cues.
- `SymptomForm.tsx` – Form for user symptoms and lifestyle factors.
- `RightPanel.tsx` – Tabs for screening, plan, posture habits, and alternatives.
- `ExerciseRunner.tsx` – Step-by-step session runner with PoseCoach integration.
- `PlanModal.tsx` – Generates a session plan from symptom data.
- `Shell.tsx` – Layout components (`Card`, `Tag`, etc.).

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
npm run dev

