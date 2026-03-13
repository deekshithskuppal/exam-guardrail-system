/**
 * AuditorDashboard.jsx — Real-time admin monitoring dashboard.
 *
 * Features:
 *  • Top nav with "AUDITOR DASHBOARD", Manage Resources button, Logout
 *  • Metrics row: Total Sessions, Active Exams, Total Violations, Total Students
 *  • Data table with student rows, status pills, SVG trust-score rings
 *  • WebSocket connection that dynamically updates rows on incoming events
 */

import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Shield, LogOut, Settings, Users, Activity,
  AlertTriangle, BarChart3, Eye, ChevronDown
} from 'lucide-react'
import ResourceModal from './ResourceModal'

// ── SVG Trust-Score Ring ──────────────────────────────────────────────────────
function TrustRing({ score }) {
  const size = 48
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color =
    score > 80 ? '#16a34a'   // green-600
    : score > 50 ? '#ca8a04' // yellow-600
    : '#dc2626'              // red-600
  const bgColor =
    score > 80 ? '#f0fdf4'
    : score > 50 ? '#fefce8'
    : '#fef2f2'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill={bgColor}
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span
        className="absolute text-xs font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  )
}

// ── Status Pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const isActive = status === 'active'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                     ${isActive
                       ? 'bg-green-50 text-green-700'
                       : 'bg-gray-100 text-gray-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
      {isActive ? 'Active' : 'Completed'}
    </span>
  )
}

// ── Demo seed data ────────────────────────────────────────────────────────────
const SEED_SESSIONS = [
  { id: 'STU-2024-001', student: 'Alice Johnson', studentId: 'STU-2024-001',
    startedAt: '2026-03-13 18:30', status: 'active', trustScore: 100, violations: 0 },
  { id: 'STU-2024-002', student: 'Bob Williams', studentId: 'STU-2024-002',
    startedAt: '2026-03-13 18:32', status: 'active', trustScore: 90, violations: 1 },
  { id: 'STU-2024-003', student: 'Clara Davis', studentId: 'STU-2024-003',
    startedAt: '2026-03-13 18:28', status: 'completed', trustScore: 70, violations: 3 },
  { id: 'STU-2024-004', student: 'David Chen', studentId: 'STU-2024-004',
    startedAt: '2026-03-13 18:35', status: 'active', trustScore: 100, violations: 0 },
]

export default function AuditorDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { adminId = 'admin' } = location.state || {}

  const [sessions, setSessions] = useState(SEED_SESSIONS)
  const [showResourceModal, setShowResourceModal] = useState(false)
  const wsRef = useRef(null)

  // ── Derived metrics ─────────────────────────────────────────────────────
  const totalSessions = sessions.length
  const activeExams   = sessions.filter((s) => s.status === 'active').length
  const totalViolations = sessions.reduce((sum, s) => sum + s.violations, 0)
  const totalStudents = new Set(sessions.map((s) => s.studentId)).size

  // ── WebSocket — receive live events from students ───────────────────────
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/admin/${adminId}`)
    wsRef.current = ws

    ws.onopen = () => console.log('[WS] Admin connected')
    ws.onclose = () => console.log('[WS] Admin disconnected')

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        const { session_id, event_type, trust_score } = data

        // Dynamically update the matching session row in state
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === session_id || s.studentId === session_id) {
              return {
                ...s,
                trustScore: trust_score ?? s.trustScore,
                violations:
                  event_type === 'VIOLATION_DETECTED'
                    ? s.violations + 1
                    : s.violations,
              }
            }
            return s
          })
        )
      } catch (err) {
        console.error('[WS] Failed to parse message:', err)
      }
    }

    return () => ws.close()
  }, [adminId])

  const handleLogout = () => navigate('/')

  // ── Metric Card helper ──────────────────────────────────────────────────
  const MetricCard = ({ icon: Icon, label, value, iconBg, iconColor }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Nav ───────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">AUDITOR DASHBOARD</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResourceModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600
                         hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Manage Resources</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600
                         hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={BarChart3}      label="Total Sessions"   value={totalSessions}
                      iconBg="bg-blue-50"   iconColor="text-blue-600" />
          <MetricCard icon={Activity}       label="Active Exams"     value={activeExams}
                      iconBg="bg-green-50"  iconColor="text-green-600" />
          <MetricCard icon={AlertTriangle}  label="Total Violations" value={totalViolations}
                      iconBg="bg-red-50"    iconColor="text-red-600" />
          <MetricCard icon={Users}          label="Total Students"   value={totalStudents}
                      iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Exam Sessions</h2>
            <span className="text-xs text-gray-400 font-medium">{totalSessions} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Started At</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Trust Score</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center
                                        text-blue-700 text-xs font-bold">
                          {s.student.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="font-medium text-gray-800">{s.student}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{s.studentId}</td>
                    <td className="px-6 py-4 text-gray-500">{s.startedAt}</td>
                    <td className="px-6 py-4"><StatusPill status={s.status} /></td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <TrustRing score={s.trustScore} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-semibold text-blue-700 hover:text-blue-800
                                         bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg
                                         transition-colors">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          VIEW DETAILS
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Resource Modal */}
      <ResourceModal isOpen={showResourceModal} onClose={() => setShowResourceModal(false)} />
    </div>
  )
}
