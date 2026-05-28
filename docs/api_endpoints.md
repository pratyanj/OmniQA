# 📡 REST API Reference Manual — Software QA Tracker

This reference document outlines the exact endpoint pathways, request payloads, response payloads, authorization parameters, and standard HTTP error structures exposed by the Python FastAPI backend API. It is designed to assist integration programmers and automated AI coding agents in making correct HTTP requests.

---

## 🔒 Global Parameters & Headers

* **Base URL Path**: `http://localhost:8000/api/v1`
* **Content-Type**: `application/json` (Required for all JSON request bodies)
* **Authorization**: `Bearer <JWT_ACCESS_TOKEN>` (Required for all endpoints except `/auth/login`)

---

## 🔐 1. Authentication Router (`/auth`)

### 1.1 Post User Login (Exchanges Credentials for JWT Token)
* **Path**: `POST /auth/login`
* **Headers**: `Content-Type: application/json`
* **Request JSON Body**:
  ```json
  {
    "email": "arjun.sharma@company.com",
    "password": "password123"
  }
  ```
* **Response JSON Payload (HTTP 200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "email": "arjun.sharma@company.com",
      "name": "Arjun Sharma",
      "role": "qa_lead",
      "color": "#f59e0b",
      "initials": "AS",
      "id": "u1"
    }
  }
  ```
* **Edge Case Error (HTTP 400 Bad Request)**:
  ```json
  {
    "detail": "Incorrect email or password"
  }
  ```

### 1.2 Fetch Active Profile Details
* **Path**: `GET /auth/me`
* **Headers**: `Authorization: Bearer <TOKEN>`
* **Response JSON Payload (HTTP 200 OK)**:
  ```json
  {
    "email": "arjun.sharma@company.com",
    "name": "Arjun Sharma",
    "role": "qa_lead",
    "color": "#f59e0b",
    "initials": "AS",
    "id": "u1"
  }
  ```
* **Edge Case Error (HTTP 401 Unauthorized)**:
  ```json
  {
    "detail": "Could not validate credentials"
  }
  ```

---

## 📦 2. Projects Router (`/projects`)

### 2.1 Retrieve Projects Directory
* **Path**: `GET /projects`
* **Headers**: `Authorization: Bearer <TOKEN>`
* **Response JSON Payload (HTTP 200 OK)**:
  ```json
  [
    {
      "name": "E-Commerce Web Portal",
      "description": "Next.js storefront and Stripe payments",
      "key": "COMMERCE",
      "icon": "🛒",
      "id": "p1",
      "created_at": "2026-05-28T12:00:00Z"
    }
  ]
  ```

### 2.2 Register a New SaaS Project
* **Path**: `POST /projects`
* **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
* **Request JSON Body**:
  ```json
  {
    "name": "Mobile Client App",
    "description": "React Native chat app",
    "key": "MOBILE",
    "icon": "📱"
  }
  ```
* **Response JSON Payload (HTTP 201 Created)**:
  ```json
  {
    "name": "Mobile Client App",
    "description": "React Native chat app",
    "key": "MOBILE",
    "icon": "📱",
    "id": "p3",
    "created_at": "2026-05-29T01:00:00Z"
  }
  ```
* **Edge Case Error: Duplicate Key Collision (HTTP 400 Bad Request)**:
  ```json
  {
    "detail": "Project key 'MOBILE' already exists."
  }
  ```

---

## 🐛 3. Bugs & Defects Router (`/bugs`)

### 3.1 Fetch Defect Queue (Supports Search, Pagination & Filters)
* **Path**: `GET /bugs`
* **Headers**: `Authorization: Bearer <TOKEN>`
* **Query Parameters (Optional)**:
  * `search`: `Stripe` (full-text search)
  * `projectId`: `p1` (filter by project)
  * `assignedTo`: `u3` (filter by developer)
  * `status`: `new` / `assigned` (filter status arrays)
  * `severity`: `critical` / `high`
  * `priority`: `p0`
  * `sortBy`: `severity` / `createdAt` (sorting index keys)
  * `sortDir`: `asc` / `desc` (sorting order direction)
* **Response JSON Payload (HTTP 200 OK)**:
  ```json
  [
    {
      "id": "b1",
      "bugId": "BUG-2026-00001",
      "title": "Stripe checkout double-click duplicate charges",
      "projectId": "p1",
      "reportedBy": "u2",
      "assignedTo": "u3",
      "status": "assigned",
      "severity": "critical",
      "priority": "p0",
      "type": "functional",
      "environment": "production",
      "platform": "web",
      "affectedVersion": "v1.4.2",
      "description": "Double click triggers parallel Stripe API charges...",
      "stepsToReproduce": [
        "Go to cart checkout",
        "Double click Pay Now button"
      ],
      "expectedResult": "Button disables immediately.",
      "actualResult": "Button allows duplicate submissions.",
      "createdAt": "2026-05-28T12:00:00Z",
      "updatedAt": "2026-05-29T01:30:00Z",
      "resolvedAt": null,
      "closedAt": null,
      "deviceInfo": {
        "browser": "Chrome 125.0",
        "os": "macOS Sonoma",
        "appVersion": "v1.4.2",
        "url": "/checkout/pay",
        "operatorName": "Priya Mehta",
        "deviceLogs": "TypeError at submit token trigger..."
      },
      "developerInfo": {
        "assignedTo": "u3",
        "estimatedFixTime": "4 hours",
        "branchName": "fix/checkout-double-click",
        "commitId": "",
        "pullRequestLink": ""
      },
      "qaVerification": {
        "fixVersion": null,
        "buildNumber": null,
        "testNotes": null,
        "verifiedBy": null,
        "verifiedAt": null
      },
      "tags": ["stripe", "checkout", "payments"],
      "comments": [],
      "attachments": [],
      "history": []
    }
  ]
  ```

### 3.2 Create a New Defect Ticket
* **Path**: `POST /bugs`
* **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
* **Request JSON Body** (Matches exact Zustand creation structure):
  ```json
  {
    "title": "Database transaction locks parallel subscription runs",
    "projectId": "p2",
    "severity": "high",
    "priority": "p1",
    "type": "database",
    "environment": "production",
    "platform": "linux",
    "affectedVersion": "v3.1.0",
    "description": "Subscription reconciler encounters parallel deadlock conflicts.",
    "stepsToReproduce": ["Launch reconciler cron", "Trigger parallel daily checkouts"],
    "expectedResult": "Database processes lock queues sequentially.",
    "actualResult": "PostgreSQL returns a deadlock Exception.",
    "tags": ["database", "deadlock", "gateway"],
    "deviceInfo": {
      "browser": "Gateway Engine",
      "os": "Ubuntu 22.04 LTS",
      "appVersion": "v3.1.0",
      "url": "/api/v1/billing/reconcile",
      "operatorName": "Priya Mehta",
      "deviceLogs": "PGError: deadlock detected at transaction block"
    },
    "developerInfo": {
      "assignedTo": "u3",
      "estimatedFixTime": "8 hours",
      "branchName": "fix/db-deadlock-reconciliation"
    },
    "attachments": []
  }
  ```
* **Response JSON Payload (HTTP 201 Created)**:
  * Returns the full `BugResponse` structure containing the auto-allocated ID (e.g. `BUG-2026-00004`), reporter UUID, empty comment/attachment lists, and creation history timeline blocks.

### 3.3 Get Bug details
* **Path**: `GET /bugs/{id}`
* **Response JSON Payload (HTTP 200 OK)**:
  * Returns the full `BugResponse` JSON model.
* **Edge Case Error (HTTP 404 Not Found)**:
  ```json
  {
    "detail": "Bug not found"
  }
  ```

### 3.4 Assign Bug to Developer
* **Path**: `POST /bugs/{id}/assign?assigneeId={developerId}`
* **Response JSON Payload (HTTP 200 OK)**:
  * Updates `assigned_to` and `status` to `assigned`, logs details to history timeline, prints standard notification triggers, and returns the modified bug details.

### 3.5 QA Verification Sign-off
* **Path**: `POST /bugs/{id}/verify`
* **Headers**: `Content-Type: application/json`
* **Request JSON Body**:
  ```json
  {
    "fixVersion": "v3.1.1",
    "buildNumber": "BUILD-20260529",
    "notes": "Verified verified transaction loops sequentially under 100 parallel clients. Deadlocks are avoided."
  }
  ```
* **Response JSON Payload (HTTP 200 OK)**:
  * Updates `status` to `verified`, populates the `qa_verification` JSON schema field, logs a sign-off timeline block, and returns details.

### 3.6 QA Reopening
* **Path**: `POST /bugs/{id}/reopen`
* **Headers**: `Content-Type: application/json`
* **Request JSON Body**:
  ```json
  {
    "reason": "Wait spinner blocks UI. Reopening to adjust loading delays."
  }
  ```
* **Response JSON Payload (HTTP 200 OK)**:
  * Updates `status` to `reopened`, resets `resolved_at` to null, populates the `qa_verification` JSON schema with reopen reason, logs a history entry, and returns details.

---

## 📎 4. Attachments Upload Router (`/attachments`)

### 4.1 Programmatic Clipboard Screenshot Upload
* **Path**: `POST /attachments/upload`
* **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`
* **Multipart Payload Parameters**:
  * `file`: (Required binary file stream parsed as standard form-data)
* **Response JSON Payload (HTTP 201 Created)**:
  ```json
  {
    "name": "pasted_screenshot.png",
    "size": 147968,
    "type": "image",
    "url": "http://localhost:8000/static/uploads/7a4d9f12_pasted_screenshot.png",
    "mimeType": "image/png"
  }
  ```
* **Edge Case Error: Empty Upload Payload (HTTP 422 Unprocessable Entity)**:
  ```json
  {
    "detail": [
      {
        "type": "missing",
        "loc": ["body", "file"],
        "msg": "Field required",
        "input": null
      }
    ]
  }
  ```
