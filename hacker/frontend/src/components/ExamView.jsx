/**
 * ExamView.jsx — Student exam interface.
 *
 * Features:
 *  • Fixed header with logo, countdown timer, resources dropdown, SECURE badge, student name
 *  • General Knowledge questions with radio buttons
 *  • WebSocket connection that emits QUESTION_NAVIGATED & VIOLATION_DETECTED events
 *  • Integrity listeners for tab-switch (visibilitychange) and right-click (contextmenu)
 *  • Red toast notifications on violations
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Shield, Clock, Link2, CheckCircle2, AlertTriangle, ChevronDown, Send } from 'lucide-react'

// ── Sample questions ──────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 1,
    text: 'Which planet is known as the "Red Planet"?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
  },
  {
    id: 2,
    text: 'What is the chemical symbol for water?',
    options: ['H2O', 'CO2', 'NaCl', 'O2'],
  },
  {
    id: 3,
    text: 'Who wrote the play "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'],
  },
  {
    id: 4,
    text: 'What is the largest ocean on Earth?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
  },
  {
    id: 5,
    text: 'In which year did the first Moon landing occur?',
    options: ['1965', '1969', '1972', '1975'],
  },
]

// ── Sample allowed resources ──────────────────────────────────────────────────
const ALLOWED_RESOURCES = [
  { title: 'Course Textbook (PDF)', url: '#' },
  { title: 'Formula Reference Sheet', url: '#' },
  { title: 'University Academic Policy', url: '#' },
]

export default function ExamView() {
  const location = useLocation()
  const navigate = useNavigate()
  const { fullName = 'Student', studentId = 'STU-000' } = location.state || {}

  // ── State ───────────────────────────────────────────────────────────────────
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(45 * 60) // 45-minute exam
  const [showResources, setShowResources] = useState(false)
  const [toasts, setToasts] = useState([])   // violation toast stack
  const [submitted, setSubmitted] = useState(false)
  const wsRef = useRef(null)

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addToast = useCallback((message) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const sendEvent = useCallback((eventType, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event_type: eventType, payload }))
    }
  }, [])

  // ── WebSocket connection ────────────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/student/${studentId}`)
    wsRef.current = ws
    ws.onopen = () => console.log('[WS] Student connected')
    ws.onclose = () => console.log('[WS] Student disconnected')
    return () => ws.close()
  }, [studentId])

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (submitted) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setSubmitted(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted])

  // ── Integrity listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    // Tab-switch detection
    const handleVisibility = () => {
      if (document.hidden) {
        sendEvent('VIOLATION_DETECTED', { reason: 'Tab switched / window hidden' })
        addToast('⚠️ Tab switch detected — this has been recorded.')
      }
    }
    // Right-click prevention
    const handleContextMenu = (e) => {
      e.preventDefault()
      sendEvent('VIOLATION_DETECTED', { reason: 'Right-click attempt' })
      addToast('⚠️ Right-click is disabled during the exam.')
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('contextmenu', handleContextMenu)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [sendEvent, addToast])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
    sendEvent('QUESTION_NAVIGATED', { question_id: questionId, selected: option })
  }

  const handleSubmit = () => {
    sendEvent('EXAM_SUBMITTED', { answers })
    setSubmitted(true)
  }

  // ── Format mm:ss ────────────────────────────────────────────────────────────
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const timerUrgent = timeLeft < 300 // under 5 min

  // ── Submitted state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Exam Submitted</h2>
          <p className="text-gray-500">Your responses have been securely recorded.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Fixed Header ──────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left — Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">SENTINEL</span>
          </div>

          {/* Right — Timer, Resources, Badge, Name */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Timer */}
            <div className={`flex items-center gap-1.5 font-mono text-sm font-semibold px-3 py-1.5 rounded-lg
                            ${timerUrgent
                              ? 'bg-red-50 text-red-700'
                              : 'bg-gray-100 text-gray-700'}`}>
              <Clock className="w-4 h-4" />
              {mins}:{secs}
            </div>

            {/* Resources dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowResources(!showResources)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-700
                           px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Resources</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showResources && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200
                                rounded-xl shadow-lg py-2 z-50">
                  <p className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Allowed Resources
                  </p>
                  {ALLOWED_RESOURCES.map((r, i) => (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50
                                 hover:text-blue-700 transition-colors"
                    >
                      {r.title}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Secure badge */}
            <span className="hidden sm:flex items-center gap-1 text-xs font-semibold text-green-700
                             bg-green-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              SECURE
            </span>

            {/* Student name */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center
                              text-blue-700 text-sm font-bold">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">{fullName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <main className="pt-24 pb-32 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">General Knowledge Assessment</h1>
          <p className="text-sm text-gray-500 mt-1">
            Answer all questions below. Your activity is monitored in real-time.
          </p>
        </div>

        <div className="space-y-5">
          {QUESTIONS.map((q, idx) => (
            <div key={q.id} className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
              <p className="font-medium text-gray-800 mb-4">
                <span className="text-blue-700 font-bold mr-2">Q{idx + 1}.</span>
                {q.text}
              </p>
              <div className="grid gap-2">
                {q.options.map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                               transition-all duration-150
                               ${answers[q.id] === opt
                                 ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                                 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleAnswer(q.id, opt)}
                      className="w-4 h-4 text-blue-700 focus:ring-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── Fixed Submit Bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 py-4 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {Object.keys(answers).length} of {QUESTIONS.length} answered
          </p>
          <button
            onClick={handleSubmit}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold
                       py-2.5 px-6 rounded-lg flex items-center gap-2
                       transition-all duration-200 shadow-md shadow-blue-700/25
                       hover:shadow-lg active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            SUBMIT EXAM
          </button>
        </div>
      </div>

      {/* ── Toast notifications (violations) ──────────────────────────────── */}
      <div className="fixed top-20 right-4 z-[100] space-y-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium
                       px-4 py-3 rounded-lg shadow-lg animate-slide-in"
            style={{
              animation: 'slideIn 0.3s ease-out',
            }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {t.message}
          </div>
        ))}
      </div>

      {/* Inline keyframe for toast animation */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
