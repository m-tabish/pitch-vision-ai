# PitchVision AI - Project Summary for LLMs

## d existing_repo
git remote add origin https://gitlab.com/alien111/agent.git
git branch -M main
git push -uf origin main
Project Overview
PitchVision AI is a web-based platform designed for grassroots cricket talent scouting. It uses client-side computer vision (MediaPipe) to analyze bowling/batting videos, calculate biomechanical joint angles, and generate AI-driven coaching and scouting reports.

## Core Tech Stack
- **Framework:** Next.js 14/15 (App Router)
- **Language:** TypeScript
- **AI Tooling:** Vercel AI SDK, Google Gemini (Gemini 1.5 Pro/Flash)
- **Computer Vision:** Google MediaPipe Pose (`@mediapipe/tasks-vision`)
  - **Styling:** Tailwind CSS + `shadcn/ui` + Lucide Iconsx
- **Deployment:** Vercel

## Key Components & Architecture
- **`src/app/page.tsx`**: Main entry point and Dashboard UI.
- **`src/app/api/scout/route.ts`**: Backen base id API for multi-agent evaluation and report generation.
- **Client-side Logic**: Video ingestion, real-time pose tracking on HTML5 Canvas, and trigonometric calculations for joint angles (e.g., elbow flexion for chucking detection).

## Features
- **Real-time Pose Tracking**: Overlays a 33-point skeleton on video using MediaPipe.
- **Biomechanical Math**: Calculates angles (e.g., elbow, knee) to detect "chucking" or evaluate technique.
- **Multi-Agent Workflow**:
  - **Evaluation Agent**: Compares technique against professional benchmarks.
  - **Vernacular Liaison Agent**: Provides feedback in local dialects (Hindi/Awadhi).
  - **Scouter Agent**: Drafts professional talent scouting dossiers.
- **Terminal UI**: Displays "Agent Execution Ledger" to show the multi-agent thought process.

## Data Schema & Logic
- **Input**: Video file (.mp4).
- **Processing**: MediaPipe extracts coordinates -> JS calculates angles -> JSON payload sent to `/api/scout`.
- **Output**: Structured scouting reports and coaching messages.

## Development Commands
- `npm install`: Install dependencies.
- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm run lint`: Run ESLint.
