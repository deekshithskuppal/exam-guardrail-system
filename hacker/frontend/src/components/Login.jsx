/**
 * Login.jsx — Student login screen.
 *
 * Full-screen dark layout with a centered white card.
 * Collects student name + ID, then navigates to /exam with state.
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, ArrowRight, BookOpen } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [studentId, setStudentId] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fullName.trim() || !studentId.trim()) return
    // Navigate to exam view, passing student info via router state
    navigate('/exam', { state: { fullName, studentId } })
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 opacity-80" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />

      <div className="relative max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-700/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">SENTINEL</h1>
              <p className="text-sm text-gray-500 mt-1">Integrity-First Exam Platform</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-blue-600 focus:border-transparent
                           outline-none transition-all placeholder:text-gray-400"
                required
              />
            </div>

            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1.5">
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                placeholder="e.g. STU-2024-001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-blue-600 focus:border-transparent
                           outline-none transition-all placeholder:text-gray-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold
                         py-2.5 px-4 rounded-lg flex items-center justify-center gap-2
                         transition-all duration-200 shadow-md shadow-blue-700/25
                         hover:shadow-lg hover:shadow-blue-700/30 active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4" />
              START EXAM
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Admin link */}
          <p className="text-center text-xs text-gray-400">
            <Link
              to="/admin"
              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              Administrator Login
            </Link>
          </p>
        </div>

        {/* Footer tag */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Secured by SENTINEL Monitoring System
        </p>
      </div>
    </div>
  )
}
