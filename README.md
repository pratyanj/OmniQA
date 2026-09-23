# 🐛 OmniQA — Obsidian QA & Automation Platform

Welcome to **OmniQA** (Obsidian Software QA & Defect Tracking Platform) — a full-stack, enterprise-grade defect tracking and test automation platform. Built with a **VS Code Dark Modern / Glassmorphism UI** on the frontend and a **FastAPI + SQLAlchemy + Playwright** core on the backend, OmniQA bridges the gap between manual QA defect reporting and automated engineering reproduction.

---

## 🌟 Key Feature Highlights

### 1. 🔄 Custom Visual Workflow Builder (`@xyflow/react`)
- **Drag-and-Drop Diagram Editor**: Design and customize project lifecycle state machines using node-and-edge visual flow graphs.
- **Custom Status Nodes & Edges**: Define start states, intermediate states, and end states with custom colors, icons, and transition paths.
- **Rule Enforcement**: Configure transition rules requiring mandatory comments or file attachments before status changes are permitted.
- **Project Workflows**: Assign specific workflows to individual projects with full backend validation blocking unauthorized status jumps.

### 2. 📋 Interactive Kanban Board (`@dnd-kit`)
- **Dynamic Columns**: Columns automatically sync and render based on the assigned project workflow nodes.
- **Smooth Drag-and-Drop**: Easily triage, prioritize, and update bug statuses in real-time.
- **Multi-Attribute Filters**: Filter issues across Projects, Severity levels, Assignees ("My Bugs", "Unassigned"), and search queries.
- **Fast Navigation**: Direct modal and page routing to inspect or edit bug details.

### 3. 🎥 Bug Session Recording & `rrweb` Event Capture
- **Floating Recorder Widget**: In-app recording tool that captures DOM events, user inputs, mouse clicks, and navigations during reproduction.
- **Video Capture & Playback**: Uploads and serves reproduction video alongside structured interaction logs.
- **Action Timeline**: Visual chronologically ordered table of user interactions with exact timestamps, event types, and target CSS selectors.

### 4. 🤖 Automated Playwright Script Generation
- **Dual-Language Output**: Automatically translates recorded DOM sessions into clean, executable Playwright scripts in both **Python** (`.py`) and **TypeScript** (`.spec.ts`).
- **Interactive Script Viewer**: In-browser code preview with syntax highlighting, one-click clipboard copying, and direct file download.
- **Developer Handoff**: Instantly share generated automation tests with assigned engineers via comments and audit history.

### 5. ⚡ In-App Playwright Test Replay Runner
- **Headed & Headless Modes**: Run tests silently in headless mode or trigger **Headed Browser** mode to launch Chromium visually on screen for live reproduction verification.
- **Live Execution Feedback**: Real-time status badges (`pending`, `running`, `passed`, `failed`, `error`), execution timers, and failure step identification.
- **Detailed Run Logs**: Full terminal standard output and error capture capped and formatted for rapid debugging.

### 6. 🐞 Linear Bug Creator & Verification Queue
- **Linear-Style Form**: Split 2-column layout mapping environment, platform, severity, priority, expected vs actual behaviors, reproduction steps, and system metadata.
- **Clipboard Paste Core**: Instant `Ctrl+V` screenshot pasting directly into forms and comments without losing form state.
- **QA Verification Queue (`/verify`)**: Dedicated queue for QA Leads and Testers to formally verify resolved tickets or reopen with documented rejection reasons.

### 7. 📊 Reports & Team Metrics Dashboard
- **Visual Analytics**: Interactive Recharts visualizations depicting severity distribution, priority breakdowns, status progression, and bug resolution velocity.
- **Audit Trails**: Complete chronological history of status changes, comments, attachments, and automation runs.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand |
| **Workflow Engine** | `@xyflow/react` (React Flow) |
| **Drag & Drop** | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| **Session Capture** | `rrweb`, MediaRecorder API |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2, SQLite / PostgreSQL |
| **Test Automation** | Playwright (Python & Node.js test runners) |
| **Data Visualization** | Recharts, Lucide React icons, React Hot Toast |
| **Containerization** | Docker (multi-stage build), Docker Compose, Nginx reverse proxy |

---

## ⚡ Quick Start

### Option A: Docker Compose (Recommended)

Run the entire platform (Frontend, Backend, and Nginx reverse proxy) with a single command:

```bash
docker-compose up --build
```

* **Web Application**: `http://localhost` (Port 80)
* **API Swagger Docs**: `http://localhost/docs`

---

### Option B: Local Development Setup

#### 1. Backend Server (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate      # Windows PowerShell
source .venv/bin/activate    # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Seed initial database with sample projects, bugs, and users
python seed.py

# Launch development server
uvicorn main:app --reload --port 8000
```

* **API Server**: `http://localhost:8000`
* **Interactive Swagger UI**: `http://localhost:8000/docs`
* **Integration Tests**: Execute requests directly via [backend/api_tests.http](file:///p:/React%20native/QA/backend/api_tests.http)

#### 2. Frontend Client (React + Vite)

```bash
# In a separate terminal from repository root:
npm install --legacy-peer-deps
npm run dev
```

* **Local Web Interface**: `http://localhost:8006`

---

## 🔐 Mock Logins (Default Password: `password123`)

| Role | Name | Email | Avatar | Permissions |
| :--- | :--- | :--- | :---: | :--- |
| **QA Lead / Admin** | Arjun Sharma | `arjun.sharma@company.com` | `AS` | Full access, Workflows, Admin, Verify Queue |
| **QA Tester** | Priya Mehta | `priya.mehta@company.com` | `PM` | Bug Reporting, Recording, Verify Queue |
| **Backend Engineer** | Rohan Verma | `rohan.verma@company.com` | `RV` | Bug Fixing, Replay Running, Dev comments |
| **Frontend Engineer** | Simran Kaur | `simran.kaur@company.com` | `SK` | Bug Fixing, Replay Running, Dev comments |

---

## 📂 Project Onboarding Documentation

For detailed technical guides, refer to the [docs/](file:///p:/React%20native/QA/docs) folder:

1. **🚀 [Getting Started Guide](file:///p:/React%20native/QA/docs/getting_started.md)**: Prerequisites, environment setup, and database seeding details.
2. **📐 [Codebase Architecture & Pipelines](file:///p:/React%20native/QA/docs/architecture.md)**: Deep architectural breakdowns, Entity-Relationship Diagrams (ERD), file uploader pipelines, and state stores.
3. **📡 [REST API Reference Manual](file:///p:/React%20native/QA/docs/api_endpoints.md)**: Complete endpoint inventory with request headers, Pydantic schemas, and sample payloads.
4. **🤖 [AI Agent Engineering Manual](file:///p:/React%20native/QA/docs/agent_instructions.md)**: Guidelines for AI Coding Assistants (token budgets, UI design system rules, safety constraints).

---

## ✨ Features Checklist

- [x] **Linear Bug Creator**: Premium 2-column layout mapping environment, platform, expected/actual behaviors, reproduction steps, and attachments.
- [x] **Clipboard Paste Core**: Directly paste screenshots from clipboard (`Ctrl+V`) or file drag tray without DOM errors.
- [x] **Interactive Kanban Board**: Drag-and-drop bug triage board with dynamic workflow columns and multi-attribute filters.
- [x] **Custom Workflow Engine**: Visual drag-and-drop workflow designer with status transition rules and project binding.
- [x] **DOM Session Recording**: Record user interaction streams with `rrweb` and store synchronized action timelines.
- [x] **Playwright Script Synthesis**: Convert recorded user sessions into runnable Python and TypeScript automation tests.
- [x] **In-App Test Replay Runner**: Execute Playwright tests in Headed (visual) or Headless modes with execution logs.
- [x] **QA Verification Queue**: Role-based triage queue to verify resolved tickets or reopen with feedback.
- [x] **Analytics & Reports Dashboard**: Visual Recharts breakdowns for bug severity, priority, status, and resolution metrics.
- [x] **Role-Based Access Control**: Granular roles (`admin`, `qa_lead`, `qa_tester`, `developer`).
- [x] **Docker Deployment**: Multi-stage production container setup with Docker Compose and Nginx reverse proxy.

---

Happy Debugging & Testing! 🚀
