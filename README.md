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
- Backend: Set your PostgreSQL credentials in `backend/database.py` or use environment variables for production.

## Features
- Real-time exam monitoring
- Admin and auditor dashboards
- Secure login
- Resource management

## License
MIT License
