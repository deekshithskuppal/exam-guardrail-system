/**
 * App.jsx — Top-level routing for SENTINEL.
 *
 * Routes:
 *   /           → Student Login
 *   /teacher    → Teacher Login
 *   /admin      → Teacher Login (alias)
 *   /exam       → Student Exam View
 *   /dashboard  → Teacher Dashboard
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
      <Route path="/teacher" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/exam" element={<ExamView />} />
      <Route path="/dashboard" element={<AuditorDashboard />} />
    </Routes>
  )
}
