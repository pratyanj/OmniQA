# 🚀 Getting Started Guide — IT QA Defect Tracker

Welcome to the IT Defect Tracking & Software QA Platform onboarding guide! This document is designed to help human developers and AI coding agents get the complete platform (React frontend + Python FastAPI backend) up and running on a local development machine.

---

## 📋 System Prerequisites
Before running the system, ensure the following are installed:
* **Node.js** (v18.0 or higher) & **npm** (v9.0 or higher)
* **Python** (v3.10 or higher) & **pip** (Python package installer)
* A modern web browser supporting standard Web APIs (for clipboard screenshot pasting and desktop notifications).

---

## 🐍 1. Backend Setup & Run (FastAPI)

The backend code is modular, self-contained, and located in the `/backend` directory. By default, it runs on a zero-config **SQLite** file-based database (`qa.db`) and automatically populates the seed database on startup.

### Installation Steps:
1. Open your terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create a clean Python virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\activate
     ```
   * **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```
4. Install all server dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Seed the database (Populates the 5 default users, 4 projects, comments, and defect tickets):
   ```bash
   python seed.py
   ```
6. Launch the development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

The backend is now active at **`http://localhost:8000`**!
* **Interactive API Swagger UI**: Visit `http://localhost:8000/docs` to test endpoints and read properties schemas directly in your browser.
* **REST Testing Suite**: Open `/backend/api_tests.http` inside your editor to run one-click HTTP tests covering standard endpoints and 10 detailed edge cases.

---

## 💻 2. Frontend Setup & Run (React / Vite)

The frontend is a premium SPA compiled with React, Vite, and Tailwind CSS.

### Installation Steps:
1. Open a separate terminal window and navigate to the root directory:
   ```bash
   cd "p:\React native\QA"
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the frontend development server:
   ```bash
   npm run dev
   ```

The frontend will run at **`http://localhost:8006`** (or a port displayed in your terminal)!

---

## 🔐 3. Default Developer Mock Accounts

The seeding script hashes a standard default password for all default team roles. You can log in instantly with **password: `password123`** using the following emails:

| Name | Role | Email | Brand Accent | Initials |
| :--- | :--- | :--- | :--- | :--- |
| **Arjun Sharma** | QA Lead / Triage | `arjun.sharma@company.com` | Hex `#f59e0b` (Orange) | AS |
| **Priya Mehta** | QA Tester / Submitter | `priya.mehta@company.com` | Hex `#10b981` (Green) | PM |
| **Rohan Verma** | Backend Developer | `rohan.verma@company.com` | Hex `#3b82f6` (Blue) | RV |
| **Simran Kaur** | Frontend Developer | `simran.kaur@company.com` | Hex `#8b5cf6` (Purple) | SK |
| **Admin User** | Administrator | `admin@company.com` | Hex `#ef4444` (Red) | AD |

---

## 🛠️ 4. Quick Debugging & Diagnostics

* **Local Screenshot Upload Cache**: Pasted screenshots or files are written on disk inside the `/backend/static/uploads` directory under unique UUID-prepended names.
* **Desktop Notifications Blocked?**: If notifications don't slide in, check your browser's address bar (click the lock icon) to verify that **Notifications permission** is set to "Allow" for `http://localhost:8006`.
* **Database Reset**: To wipe all tickets and restart from a clean, original seed dataset, simply terminate the Uvicorn terminal process, delete the generated `/backend/qa.db` sqlite file from disk, and run `python seed.py` again.
