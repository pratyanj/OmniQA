# 🐛 Obsidian Software QA & Defect Tracking Platform

Welcome to the **Obsidian Software QA & Defect Tracking Platform** repository! This is a state-of-the-art defect tracking application featuring a premium **VS Code Dark Modern / Glassmorphism UI** on the frontend (React + Vite + Zustand + Tailwind CSS) and a robust, fully structured relational database core on the backend (FastAPI + SQLAlchemy + Pydantic + SQLite).

The platform is designed to provide software testers with visual split-screen linear bug creators, seamless clipboard screenshot copy-pasting, persistent desktop notifications, and detailed reproduction flow panels.

---

## 📂 Project Onboarding Documentation

We have compiled comprehensive guides inside the [docs/](file:///p:/React%20native/QA/docs) folder to help developers and AI coding agents onboard and start building immediately.

Please read the specific guides depending on your tasks:

1. **🚀 [Getting Started Guide](file:///p:/React%20native/QA/docs/getting_started.md)**:
   Learn the prerequisites, installation instructions, database seeding commands, and mock credentials to get the complete client and server up and running on a local development setup in minutes.
   
2. **📐 [Codebase Architecture & Pipelines](file:///p:/React%20native/QA/docs/architecture.md)**:
   Explore the deep architectural details of our tech stack, detailed entity-relationship diagrams (ERD) mapping database schemas, copy-paste uploader pipelines, theme compilers, and desktop notification structures.

3. **📡 [REST API Reference Manual](file:///p:/React%20native/QA/docs/api_endpoints.md)**:
   A manual for integration developers and AI agents outlining every endpoint path, request headers, Pydantic parameters, JSON payloads, and error codes exposed by the FastAPI server.

4. **🤖 [AI Agent Engineering Manual](file:///p:/React%20native/QA/docs/agent_instructions.md)**:
   A high-context manual specifically tailored for AI Coding Assistants (e.g. Cursor, Antigravity, Cline). It documents visual theme tokens, the "Three Golden Laws" of code safety, and step-by-step engineering recipes (like adding new variables or testing APIs).

---

## ⚡ Quick Start Checklist

### 1. Launch the FastAPI Backend Server
```bash
cd backend
python -m venv .venv
# Activate virtual environment
.venv\Scripts\activate      # Windows PowerShell
source .venv/bin/activate    # macOS / Linux

# Install packages
pip install -r requirements.txt

# Relational database seeding
python seed.py

# Run Uvicorn development server
uvicorn main:app --reload --port 8000
```
* **Interactive swagger documentation**: `http://localhost:8000/docs`
* **Test Suite**: Run individual integration steps inside [backend/api_tests.http](file:///p:/React%20native/QA/backend/api_tests.http)

### 2. Launch the React Client Application
```bash
# In a separate terminal shell from the root directory:
npm install
npm run dev
```
* **Local Web Interface**: `http://localhost:8006`

---

## 🔐 Mock Logins (Default Password: `password123`)

* **QA Lead / Triager**: `arjun.sharma@company.com` (AS)
* **QA Tester / Submitter**: `priya.mehta@company.com` (PM)
* **Backend Engineer**: `rohan.verma@company.com` (RV)
* **Frontend Engineer**: `simran.kaur@company.com` (SK)

---

## ✨ Features Checklist
- [x] **Linear Bug Creator**: Premium 2-column layout mapping all environment, platform, expected, actual, and system variables seamlessly.
- [x] **Clipboard Paste Core**: Directly paste multiple screenshot images from clipboard using `Ctrl+V` or the file picker tray without stale-state DOM errors.
- [x] **Desktop Assignment Alerts**: Receive native browser push notifications when bugs are assigned or reassigned to teammates.
- [x] **Obsidian Visual Theme**: Glass-like transparent container layout that conforms perfectly to VS Code Dark Modern elements.
- [x] **Full-Suite Backend**: Complete SQLite/SQLAlchemy model architecture supporting migrations, multi-part attachment uploads, comment feeds, and audit trails.

Happy Debugging! 🚀
