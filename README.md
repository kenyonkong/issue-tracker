# Issue Tracker

A small full-stack issue tracker for creating, viewing, filtering, editing, and deleting issues. The backend stores issues in memory, so the application requires no database for local development.

## Features

- Create issues with a required title, status, and priority plus an optional description.
- Generate a unique numeric ID for each issue on the backend.
- Use `Open`, `In Progress`, or `Resolved` status and `High`, `Medium`, or `Low` priority.
- Reject empty and whitespace-only titles in the frontend and backend.
- Prevent duplicate titles while a matching issue is Open or In Progress. Comparison is case-insensitive and normalizes whitespace; matching Resolved issues may be created again.
- Filter by one status, one priority, or both simultaneously.
- Sort status-only results by priority from High to Low.
- Sort priority-only results by status from Open to Resolved.
- Edit an issue's description, status, and priority while keeping its title and ID unchanged.
- Delete issues by their backend-generated ID.
- Display validation, duplicate, API, and missing-ID errors in the UI.
- Use the interface on desktop and smaller screens.

## Tech stack

### Frontend

- React
- Vite
- JavaScript and JSX
- CSS
- ESLint

### Backend

- Python 3.10+
- FastAPI
- Pydantic for validation and schemas
- Uvicorn development server
- Pytest and HTTPX for API tests

## Data model

Each issue has the following shape:

```json
{
  "id": 1,
  "title": "Fix login",
  "description": "Users cannot sign in",
  "status": "Open",
  "priority": "High"
}
```

Data is stored in backend memory and is cleared whenever the backend process restarts. The project does not currently use persistent database storage.

## API

| Method | Route | Behavior |
| --- | --- | --- |
| `GET` | `/api/issues` | Return all issues. |
| `POST` | `/api/issues` | Validate and create an issue. |
| `PATCH` | `/api/issues/{issue_id}` | Update description, status, and/or priority. |
| `DELETE` | `/api/issues/{issue_id}` | Delete an issue by ID. |

The API returns `404 Not Found` when PATCH or DELETE targets an unknown ID and `409 Conflict` when creation or an update would produce duplicate active titles. FastAPI's interactive API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs) while the backend is running.

## Prerequisites

- Python 3.10 or newer
- Node.js 20 or newer
- npm

## Initial setup

Clone the repository and open its root directory, then install backend dependencies:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

Install frontend dependencies:

```powershell
cd ..\frontend
npm install
```

## Launch the full-stack application

The backend and frontend run as separate development processes. Open two terminals at the repository root.

In the first terminal, start FastAPI on port 8000:

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

In the second terminal, start Vite:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies frontend requests beginning with `/api` to the backend at `http://localhost:8000`.

If PowerShell blocks `npm.ps1` because of its execution policy, use the Windows command shim instead:

```powershell
npm.cmd run dev
```

## Verification commands

Run backend tests from the repository root:

```powershell
cd backend
.venv\Scripts\python.exe -m pytest
```

Run frontend linting and create a production build:

```powershell
cd frontend
npm run lint
npm run build
```

The production frontend files are generated in `frontend/dist`.
