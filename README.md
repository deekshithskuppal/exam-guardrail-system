# SENTINEL — Real-Time Exam Monitoring Platform

## Overview
SENTINEL is an integrity-first, real-time exam monitoring platform. It features a React + Vite frontend and a FastAPI backend with async SQLAlchemy and PostgreSQL.

## Project Structure

```
hacker/
  backend/      # FastAPI backend (Python)
  frontend/     # React frontend (Vite)
```

## Backend (FastAPI)
- Located in `hacker/backend`
- Uses async SQLAlchemy, PostgreSQL
- Main entry: `main.py`
- Install dependencies:
  ```bash
  pip install -r requirements.txt
  ```
- Create `.env` from the committed template in `hacker/backend` (auto-loaded):
  ```bash
  cp .env.example .env
  ```
- Quick local PostgreSQL (Docker):
  ```bash
  docker run --name sentinel-postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=sentinel \
    -p 5432:5432 -d postgres:16
  ```
- Run backend:
  ```bash
  uvicorn main:app --reload
  ```

## Frontend (React + Vite)
- Located in `hacker/frontend`
- Install dependencies:
  ```bash
  npm install
  ```
- Start development server:
  ```bash
  npm run dev
  ```
- Open [http://localhost:5173](http://localhost:5173) in your browser.

## Environment Variables
- Backend:
  - `DATABASE_URL` (recommended in `.env`; defaults to local dev URL if omitted)
  - `SQL_ECHO` (`true` or `false`, optional)

## Features
- Real-time exam monitoring
- Admin and auditor dashboards
- Secure login
- Resource management

## License
MIT License
