/**
 * App.jsx — Top-level routing for SENTINEL.
 *
 * Routes:
 *   /           → Student Login
 *   /admin      → Auditor Login
 *   /exam       → Student Exam View
 *   /dashboard  → Auditor Dashboard
 */

import { Routes, Route } from 'react-router-dom'
import Login from './components/Login'
import AdminLogin from './components/AdminLogin'
import ExamView from './components/ExamView'
import AuditorDashboard from './components/AuditorDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/exam" element={<ExamView />} />
      <Route path="/dashboard" element={<AuditorDashboard />} />
    </Routes>
  )
}
