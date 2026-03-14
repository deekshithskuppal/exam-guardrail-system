/**
 * AuditorDashboard.jsx — Real-time teacher monitoring dashboard.
 *
 * Features:
 *  • Top nav with "TEACHER DASHBOARD", Manage Resources button, Logout
 *  • Metrics row: Total Sessions, Active Exams, Total Violations, Total Students
 *  • Data table with student rows, status pills, SVG trust-score rings
 *  • WebSocket connection that dynamically updates rows on incoming events
 */

import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Shield, LogOut, Settings, Users, Activity,
  AlertTriangle, BarChart3, Eye, X, Wifi, WifiOff, ClipboardList
} from 'lucide-react'
import ResourceModal from './ResourceModal'
import { WS_BASE_URL } from '../config/network'
import { API_BASE_URL } from '../config/network'

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

export default function AuditorDashboard({
  initialSessions = [],
  wsBaseUrl = WS_BASE_URL,
  enableRealtime = true,
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { adminId = 'admin' } = location.state || {}

  const [sessions, setSessions] = useState(initialSessions)
  const [eventsBySession, setEventsBySession] = useState({})
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [panelViolations, setPanelViolations] = useState(0)
  const [panelToasts, setPanelToasts] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [strictMetrics, setStrictMetrics] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const loadSessions = async () => {
      setLoadingSessions(true)
      setLoadError('')
      try {
        const [sessionsRes, metricsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/sessions/summary`),
          fetch(`${API_BASE_URL}/api/v1/sessions/metrics`),
        ])

        if (!sessionsRes.ok) {
          throw new Error(`Request failed with status ${sessionsRes.status}`)
        }

        const data = await sessionsRes.json()
        const metricsData = metricsRes.ok ? await metricsRes.json() : null

        if (!cancelled) {
          setSessions(Array.isArray(data) ? data : [])
          setStrictMetrics(metricsData)
        }
      } catch (error) {
        // Backend unreachable or DB not ready — silently fall back to empty list.
        // The WebSocket connection will populate rows as students start exams.
        if (!cancelled) {
          setLoadError('Unable to load saved sessions right now. Live updates will still appear here.')
          setSessions([])
          setStrictMetrics(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingSessions(false)
        }
      }
    }

    loadSessions()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Derived metrics ─────────────────────────────────────────────────────
  const totalSessions = sessions.length
  const activeExams   = sessions.filter((s) => s.status === 'active').length
  const totalViolations = sessions.reduce((sum, s) => sum + s.violations, 0)
  const totalStudents = new Set(sessions.map((s) => s.studentId)).size

  const strictTotalSessions = strictMetrics?.total_sessions ?? totalSessions
  const strictActiveExams = strictMetrics?.active_exams ?? activeExams
  const strictTotalViolations = strictMetrics?.total_violations ?? totalViolations
  const strictTotalStudentsAttended = strictMetrics?.total_students_attended ?? totalStudents

  // ── WebSocket — receive live events from students ───────────────────────
  useEffect(() => {
    if (!enableRealtime) return undefined

    const ws = new WebSocket(`${wsBaseUrl}/ws/admin/${adminId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      console.log('[WS] Admin connected')
    }
    ws.onclose = () => {
      setWsConnected(false)
      console.log('[WS] Admin disconnected')
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        const { session_id, event_type, trust_score, payload, timestamp, result_sheet } = data
        const incomingStudentId = payload?.student_id || session_id
        const incomingStudentName = payload?.student_name || result_sheet?.student_name || 'Unknown Student'
        const incomingResultSheet = result_sheet || payload?.result_sheet || null

        setEventsBySession((prev) => {
          const existing = prev[session_id] || []
          const nextEvent = {
            id: `${session_id}-${Date.now()}`,
            eventType: event_type,
            timestamp: timestamp || new Date().toISOString(),
            reason: payload?.reason || null,
            details: payload,
          }
          return {
            ...prev,
            [session_id]: [nextEvent, ...existing].slice(0, 20),
          }
        })

        // Dynamically update the matching session row in state
        setSessions((prev) => {
          const existingIndex = prev.findIndex(
            (s) => s.id === session_id || s.studentId === incomingStudentId
          )

          if (existingIndex >= 0) {
            return prev.map((s, idx) => {
              if (idx !== existingIndex) return s
              return {
                ...s,
                student: incomingStudentName,
                studentId: incomingStudentId,
                status: event_type === 'EXAM_SUBMITTED' ? 'completed' : s.status,
                trustScore: trust_score ?? s.trustScore,
                score: incomingResultSheet?.score ?? s.score,
                totalQuestions: incomingResultSheet?.total_questions ?? s.totalQuestions,
                finalPercentage: incomingResultSheet?.final_percentage ?? s.finalPercentage,
                submittedAt: event_type === 'EXAM_SUBMITTED' ? (timestamp || new Date().toISOString()) : s.submittedAt,
                resultSheet: incomingResultSheet ?? s.resultSheet,
                violations:
                  event_type === 'VIOLATION_DETECTED'
                    ? s.violations + 1
                    : (incomingResultSheet?.violations ?? s.violations),
              }
            })
          }

          const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
          return [
            {
              id: session_id,
              student: incomingStudentName,
              studentId: incomingStudentId,
              startedAt: now,
              status: event_type === 'EXAM_SUBMITTED' ? 'completed' : 'active',
              trustScore: trust_score ?? 100,
              score: incomingResultSheet?.score ?? null,
              totalQuestions: incomingResultSheet?.total_questions ?? null,
              finalPercentage: incomingResultSheet?.final_percentage ?? null,
              submittedAt: event_type === 'EXAM_SUBMITTED' ? (timestamp || new Date().toISOString()) : null,
              resultSheet: incomingResultSheet,
              violations: event_type === 'VIOLATION_DETECTED' ? 1 : (incomingResultSheet?.violations ?? 0),
            },
            ...prev,
          ]
        })
      } catch (err) {
        console.error('[WS] Failed to parse message:', err)
      }
    }

    return () => ws.close()
  }, [adminId, enableRealtime, wsBaseUrl])

  const handleLogout = () => navigate('/')

  const handleViewDetails = (session) => {
    setSelectedSessionId(session.id)
    setShowDetailsModal(true)
  }

  const selectedSession = selectedSessionId
    ? sessions.find((session) => session.id === selectedSessionId) || null
    : null

  const selectedSessionEvents = selectedSession
    ? (eventsBySession[selectedSession.id] || [])
    : []

  const renderEventLabel = (eventType) => {
    if (eventType === 'VIOLATION_DETECTED') return 'Violation detected'
    if (eventType === 'ADMIN_VIOLATION_DETECTED') return 'Auditor panel violation detected'
    if (eventType === 'QUESTION_NAVIGATED') return 'Question navigated'
    if (eventType === 'EXAM_SUBMITTED') return 'Exam submitted'
    return eventType || 'Unknown event'
  }

  const formatDateTime = (value) => {
    if (!value) return 'N/A'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
  }

  const renderExamSessionCell = (session) => {
    if (session.score == null || session.totalQuestions == null) {
      return (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-700">Session {session.id.slice(0, 8)}</p>
          <p className="text-xs text-stone-500">Exam in progress. Final score will appear after submission.</p>
        </div>
      )
    }

    return (
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-stone-800">Session {session.id.slice(0, 8)}</p>
        <p className="text-xs text-stone-600">
          Score {session.score}/{session.totalQuestions} • {session.finalPercentage ?? 0}%
        </p>
        <p className="text-xs text-stone-500">
          Violations {session.violations} • Completed {formatDateTime(session.submittedAt)}
        </p>
      </div>
    )
  }

  useEffect(() => {
    const keyState = {
      ctrlOrMeta: false,
      alt: false,
      tab: false,
    }
    let lastKeyboardSwitchAt = 0

    const addPanelToast = (message) => {
      const id = Date.now()
      setPanelToasts((prev) => [...prev, { id, message }])
      setTimeout(() => {
        setPanelToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3500)
    }

    const registerPanelViolation = (reason, message, event = null) => {
      if (event) {
        event.preventDefault()
      }
      setPanelViolations((prev) => prev + 1)
      addPanelToast(message)

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event_type: 'ADMIN_VIOLATION_DETECTED',
            payload: {
              reason,
              admin_id: adminId,
              source: 'auditor_panel',
            },
          })
        )
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        registerPanelViolation(
          'Auditor switched tab/window (possible Alt+Tab)',
          'Auditor tab/window switch detected.'
        )
      }
    }

    const handleKeydown = (e) => {
      const key = String(e.key || '').toLowerCase()
      const withModifier = e.ctrlKey || e.metaKey

      keyState.ctrlOrMeta = e.ctrlKey || e.metaKey
      keyState.alt = e.altKey
      if (key === 'tab') {
        keyState.tab = true
      }

      if (withModifier && key === 'c') {
        registerPanelViolation(
          'Auditor copy shortcut attempt (Ctrl/Cmd+C)',
          'Auditor copy shortcut detected.',
          e
        )
        return
      }

      if (withModifier && key === 'v') {
        registerPanelViolation(
          'Auditor paste shortcut attempt (Ctrl/Cmd+V)',
          'Auditor paste shortcut detected.',
          e
        )
        return
      }

      if (e.altKey && key === 'tab') {
        lastKeyboardSwitchAt = Date.now()
        registerPanelViolation(
          'Auditor Windows app switch attempt (Alt+Tab)',
          'Auditor Alt+Tab attempt detected.',
          e
        )
        return
      }

      if (e.ctrlKey && key === 'tab') {
        lastKeyboardSwitchAt = Date.now()
        registerPanelViolation(
          'Auditor browser tab switch attempt (Ctrl+Tab)',
          'Auditor Ctrl+Tab attempt detected.',
          e
        )
        return
      }

      if ((e.metaKey || e.ctrlKey) && key === 'tab') {
        lastKeyboardSwitchAt = Date.now()
        registerPanelViolation(
          'Auditor keyboard tab switch attempt (Ctrl/Cmd+Tab)',
          'Auditor keyboard tab switch attempt detected.',
          e
        )
      }
    }

    const handleKeyup = (e) => {
      const key = String(e.key || '').toLowerCase()
      if (key === 'tab') keyState.tab = false
      if (key === 'alt') keyState.alt = false
      if (key === 'control' || key === 'meta') keyState.ctrlOrMeta = false
    }

    const handleWindowBlur = () => {
      const keyboardSwitch = keyState.tab && (keyState.ctrlOrMeta || keyState.alt)
      if (!keyboardSwitch) return

      const now = Date.now()
      if (now - lastKeyboardSwitchAt < 600) return
      lastKeyboardSwitchAt = now

      registerPanelViolation(
        'Auditor keyboard-driven window/tab switch detected',
        'Auditor keyboard tab/window switch detected.'
      )
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('keyup', handleKeyup)
    window.addEventListener('blur', handleWindowBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('keyup', handleKeyup)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [adminId])

  // ── Metric Card helper ──────────────────────────────────────────────────
  const MetricCard = ({ icon: Icon, label, value, iconBg, iconColor }) => (
    <div className="rounded-2xl border border-white/70 bg-white/80 shadow-[0_16px_40px_rgba(120,53,15,0.12)] backdrop-blur p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
        <p className="text-xs text-stone-600 font-medium">{label}</p>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,248,227,0.98),_rgba(255,223,184,0.9)_34%,_rgba(251,178,123,0.75)_58%,_rgba(120,53,15,0.32)_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0)_28%,rgba(120,53,15,0.18)_100%)]" />
      <div className="pointer-events-none absolute -left-20 top-[-5rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,251,237,0.95)_0%,_rgba(255,214,154,0.72)_38%,_rgba(255,185,104,0.08)_72%,_transparent_73%)] blur-sm sunrise-float" />
      <div className="pointer-events-none absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,248,230,0.62)_0%,_rgba(255,220,168,0.28)_38%,_transparent_70%)] blur-2xl" />

      {/* ── Top Nav ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[linear-gradient(135deg,#9a3412,#ea580c,#fb923c)] rounded-xl flex items-center justify-center shadow-[0_12px_24px_rgba(194,65,12,0.3)]">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-display text-lg font-bold text-stone-900 tracking-tight">TEACHER DASHBOARD</h1>
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${wsConnected ? 'bg-emerald-50/90 border-emerald-200 text-emerald-700' : 'bg-white/70 border-orange-200 text-orange-700'}`}>
              {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {wsConnected ? 'LIVE' : 'OFFLINE'}
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200 bg-red-50/80 text-red-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              PANEL VIOLATIONS {panelViolations}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResourceModal(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-stone-700
                         hover:text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-50/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Manage Resources</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-semibold text-stone-700
                         hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50/90 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={BarChart3}      label="Total Sessions"   value={strictTotalSessions}
                      iconBg="bg-orange-100"   iconColor="text-orange-700" />
          <MetricCard icon={Activity}       label="Active Exams"     value={strictActiveExams}
                      iconBg="bg-emerald-100"  iconColor="text-emerald-700" />
          <MetricCard icon={AlertTriangle}  label="Total Violations" value={strictTotalViolations}
                      iconBg="bg-red-100"    iconColor="text-red-700" />
          <MetricCard icon={Users}          label="Total Students Attended"   value={strictTotalStudentsAttended}
                      iconBg="bg-amber-100" iconColor="text-amber-700" />
        </div>

        {/* Sessions Table */}
        <div className="rounded-2xl border border-white/70 bg-white/82 shadow-[0_20px_50px_rgba(120,53,15,0.13)] backdrop-blur overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100 flex items-center justify-between bg-[linear-gradient(120deg,rgba(255,252,246,0.9),rgba(255,246,233,0.66))]">
            <h2 className="text-base font-bold text-stone-900">Exam Sessions</h2>
            <span className="text-xs text-stone-500 font-medium">{totalSessions} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-50/60 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Started At</th>
                  <th className="px-6 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Exam Session</th>
                  <th className="px-6 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider text-center">Trust Score</th>
                  <th className="px-6 py-3 text-xs font-semibold text-stone-600 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100/70">
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-stone-600">
                      {loadingSessions
                        ? 'Loading student sessions...'
                        : (loadError || 'No active sessions yet. Students will appear here automatically once they start an exam.')}
                    </td>
                  </tr>
                )}
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-orange-50/45 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center
                                        text-orange-800 text-xs font-bold">
                          {s.student.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="font-medium text-stone-800">{s.student}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-stone-600 font-mono text-xs">{s.studentId}</td>
                    <td className="px-6 py-4 text-stone-600">{formatDateTime(s.startedAt)}</td>
                    <td className="px-6 py-4 min-w-[240px]">{renderExamSessionCell(s)}</td>
                    <td className="px-6 py-4"><StatusPill status={s.status} /></td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <TrustRing score={s.trustScore} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(s)}
                        className="text-xs font-semibold text-orange-800 hover:text-orange-900
                                         bg-orange-100/80 hover:bg-orange-200/80 px-3 py-1.5 rounded-lg
                                         transition-colors"
                      >
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

      {/* Session Details Modal */}
      {showDetailsModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.2),_rgba(0,0,0,0.45)_56%)] backdrop-blur-sm"
            onClick={() => setShowDetailsModal(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/88 shadow-[0_32px_80px_rgba(120,53,15,0.26)] backdrop-blur">
            <div className="px-6 py-4 border-b border-orange-100 bg-[linear-gradient(120deg,rgba(255,252,246,0.92),rgba(255,246,233,0.7))] flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-orange-800/70 font-semibold">Session Details</p>
                <h3 className="text-lg font-bold text-stone-900">{selectedSession.student}</h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-orange-800 hover:bg-orange-100 transition-colors"
                aria-label="Close details modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 grid sm:grid-cols-2 gap-4 border-b border-orange-100 text-sm bg-white/70">
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Student ID</p>
                <p className="font-mono text-stone-700">{selectedSession.studentId}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Status</p>
                <div className="mt-1"><StatusPill status={selectedSession.status} /></div>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Started At</p>
                <p className="text-stone-700">{selectedSession.startedAt}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Trust Score</p>
                <p className="text-stone-900 font-semibold">{selectedSession.trustScore}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs uppercase tracking-wide">Violations</p>
                <p className="text-stone-900 font-semibold">{selectedSession.violations}</p>
              </div>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto space-y-5 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,248,236,0.65))]">
              {(selectedSession.resultSheet || selectedSession.score != null) && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/80 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-orange-200">
                    <h4 className="text-sm font-semibold text-orange-900">Submitted Result Sheet</h4>
                  </div>
                  <div className="divide-y divide-orange-200 text-sm">
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-orange-800/80">Student Name</span>
                      <span className="font-semibold text-stone-900">
                        {selectedSession.resultSheet?.student_name || selectedSession.student}
                      </span>
                    </div>
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-orange-800/80">Score</span>
                      <span className="font-semibold text-stone-900">
                        {selectedSession.resultSheet?.score ?? selectedSession.score ?? 0}
                        {' / '}
                        {selectedSession.resultSheet?.total_questions ?? selectedSession.totalQuestions ?? 0}
                      </span>
                    </div>
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-orange-800/80">Violations</span>
                      <span className="font-semibold text-stone-900">
                        {selectedSession.resultSheet?.violations ?? selectedSession.violations}
                      </span>
                    </div>
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-orange-800/80">Final Percentage</span>
                      <span className="font-semibold text-stone-900">
                        {(selectedSession.resultSheet?.final_percentage ?? selectedSession.finalPercentage ?? 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-orange-700" />
                <h4 className="text-sm font-semibold text-stone-800">Recent Activity</h4>
              </div>

              {selectedSessionEvents.length === 0 ? (
                <p className="text-sm text-stone-500">No live events received for this session yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedSessionEvents.map((event) => (
                    <div key={event.id} className="border border-orange-100 rounded-lg p-3 bg-white/80 shadow-[0_8px_24px_rgba(120,53,15,0.07)]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-800">{renderEventLabel(event.eventType)}</p>
                        <p className="text-xs text-stone-500">{new Date(event.timestamp).toLocaleString()}</p>
                      </div>
                      {event.reason ? (
                        <p className="mt-1 text-sm text-red-700">Reason: {event.reason}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-20 right-4 z-[100] space-y-2 w-80">
        {panelToasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg"
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {t.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
