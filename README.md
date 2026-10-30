# React + FastAPI Starter

Minimal full-stack project with a React/Vite frontend and a FastAPI backend.

## Prerequisites

- Node.js 20+ and npm
- Python 3.10+

## Setup

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

### Frontend

```powershell
cd frontend
npm install
```

## Run locally

Start the backend in one terminal:

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Start the frontend in another terminal:

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` requests to the backend at http://localhost:8000.

The issue API is available at `http://localhost:8000/api/issues`. It supports `GET` to list issues and `POST` to create one. Data is held in memory and resets whenever the backend restarts. Interactive API documentation is at http://localhost:8000/docs.

## Checks

```powershell
cd backend
.venv\Scripts\python.exe -m pytest

cd ..\frontend
npm run lint
npm run build
```

