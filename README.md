# PitchVision AI 🏏

## 👥 Team Neural Nexus
*   **Rajneesh Verma** ([@rajneeshverma1](https://github.com/rajneeshverma1))
*   **Mohammad Tabish** ([@m-tabish](https://github.com/m-tabish))

---

## 📖 Project Overview
**PitchVision AI** is an AI-powered biomechanical analysis platform designed for grassroots cricket scouting. By using client-side computer vision and the Gemini 1.5 Pro/Flash LLM, it helps young players in local maidans (like those in Lucknow) get professional-grade coaching feedback and standardized scouting dossiers using just a smartphone camera.

**Demo Video Link:** [Watch here](https://drive.google.com/file/d/1QOCxON-JBW9EkeQ2OZ3K_8KHbZujddyb/view?usp=sharing)

### 🌟 Recent Features & Additions
*   **Three-Tier Biomechanical Grading System:** Implemented a robust evaluation system aligning with professional sports science benchmarks (Grade A: Elite, Grade B: Developing, Grade C: Needs Work).
*   **Standard Reference Calibration:** The user interface and exported reports now show standardized target benchmarks directly alongside recorded angles (e.g. elbow flexion, front knee bracing) for real-time compliance checking.
*   **Visual Rebranding (Orange Theme):** Remade the entire UI and reporting layout with a premium, state-of-the-art orange branding palette (`#FF6B00`).
*   **Live Webcam Biomechanical Tracking:** Active webcam tracking overlay renders real-time MediaPipe joint angles and skeletal outlines directly in the browser.
*   **Unicode PDF Rendering Support:** Integrated `@pdf-lib/fontkit` with a dynamically loaded/cached Noto Sans Devanagari font to enable error-free rendering of Hindi and Awadhi vernacular coaching tips inside the generated PDF dossier.

---

## 🎯 The Core Problem
Lucknow has an incredible amount of raw cricket talent, but the path from street cricket to formal selection is broken:
*   **Lack of Local Scouting:** Professional scouts cannot visit every local park or neighborhood.
*   **Injury & Illegal Actions:** Young bowlers often develop "chucking" actions or high-impact knee bends without realizing it, leading to future injuries or disqualifications.
*   **Communication Gap:** There is a lack of professional sports portfolios for grassroots players to present to academies or UPCA selectors.

---

## 🛠️ Tech Stack & Tools
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS + Vanilla CSS (globals.css) + Lucide Icons
*   **Computer Vision:** Google MediaPipe Pose (`@mediapipe/tasks-vision`) - Runs entirely client-side.
*   **PDF Generation:** `pdf-lib` + `@pdf-lib/fontkit` (with dynamic Devanagari glyph embedding)
*   **AI Orchestration:** Vercel AI SDK
*   **LLM:** Google Gemini 2.5 Flash / Gemini 1.5 Pro
*   **Deployment:** Vercel

---

## 🚀 Setup & Run Instructions

### Prerequisites
*   Node.js (v18.17 or higher)
*   A Google Gemini API Key

### Local Setup
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/m-tabish/neural-nex-apl.git
    cd neural-nex-apl
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Variables:**
    Create a `.env.local` file in the root and add your API key:
    ```env
    GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
    ```
4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚠️ Known Limitations & Incomplete Features
*   **Single-Player Focus:** The current vision engine works best when only one player is in the frame.
*   **Camera Angle Sensitivity:** Math calculations are most accurate from direct side-on or front-on profiles; extreme diagonal angles may skew joint results.
*   **Historical Tracking:** Currently, analysis is per-session/per-frame; a database for tracking a player's progress over time is yet to be implemented.
