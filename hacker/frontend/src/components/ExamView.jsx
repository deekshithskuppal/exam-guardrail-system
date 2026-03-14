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
import { WS_BASE_URL } from '../config/network'

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

const ANSWER_KEY = {
  1: 'Mars',
  2: 'H2O',
  3: 'William Shakespeare',
  4: 'Pacific Ocean',
  5: '1969',
}

// ── Sample allowed resources ──────────────────────────────────────────────────
const ALLOWED_RESOURCES = [
  { title: 'Course Textbook (PDF)', url: '#' },
  { title: 'Formula Reference Sheet', url: '#' },
  { title: 'University Academic Policy', url: '#' },
]

export default function ExamView() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    fullName = 'Student',
    studentId = 'STU-000',
    adminId = '',
    adminIds: incomingAdminIds = [],
  } = location.state || {}
  const sessionIdRef = useRef(crypto.randomUUID())
  const normalizedAdminIds = Array.isArray(incomingAdminIds)
    ? incomingAdminIds.map((value) => String(value).trim()).filter(Boolean)
    : []
  const effectiveAdminIds = normalizedAdminIds.length > 0
    ? normalizedAdminIds
    : (adminId ? [adminId] : [])

  // ── State ───────────────────────────────────────────────────────────────────
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(45 * 60) // 45-minute exam
  const [showResources, setShowResources] = useState(false)
  const [toasts, setToasts] = useState([])   // violation toast stack
  const [submitted, setSubmitted] = useState(false)
  const [violationCount, setViolationCount] = useState(0)
  const [resultSheet, setResultSheet] = useState(null)
  const wsRef = useRef(null)

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addToast = useCallback((message) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const sendEvent = useCallback((eventType, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event_type: eventType,
          payload: {
            ...payload,
            student_id: studentId,
            student_name: fullName,
            admin_id: effectiveAdminIds[0] || '',
            admin_ids: effectiveAdminIds,
          },
        })
      )
    }
  }, [effectiveAdminIds, fullName, studentId])

  const buildResultSheet = useCallback((currentAnswers, currentViolations) => {
    const score = QUESTIONS.reduce((sum, question) => {
      const selected = currentAnswers[question.id]
      return selected === ANSWER_KEY[question.id] ? sum + 1 : sum
    }, 0)
    const totalQuestions = QUESTIONS.length
    const finalPercentage = Number(((score / totalQuestions) * 100).toFixed(2))

    return {
      student_name: fullName,
      student_id: studentId,
      score,
      total_questions: totalQuestions,
      violations: currentViolations,
      final_percentage: finalPercentage,
    }
  }, [fullName, studentId])

  const finalizeSubmission = useCallback((submitReason) => {
    if (submitted) return
    const sheet = buildResultSheet(answers, violationCount)
    setResultSheet(sheet)
    sendEvent('EXAM_SUBMITTED', {
      answers,
      submit_reason: submitReason,
      result_sheet: sheet,
    })
    setSubmitted(true)
  }, [answers, buildResultSheet, sendEvent, submitted, violationCount])

  // ── WebSocket connection ────────────────────────────────────────────────────
  useEffect(() => {
    const sessionId = sessionIdRef.current
    const params = new URLSearchParams()
    if (effectiveAdminIds[0]) {
      params.set('admin_id', effectiveAdminIds[0])
    }
    if (effectiveAdminIds.length > 0) {
      params.set('admin_ids', effectiveAdminIds.join(','))
    }
    const query = params.toString()
    const ws = new WebSocket(`${WS_BASE_URL}/ws/student/${sessionId}${query ? `?${query}` : ''}`)
    wsRef.current = ws
    ws.onopen = () => console.log('[WS] Student connected')
    ws.onclose = () => console.log('[WS] Student disconnected')
    return () => ws.close()
  }, [effectiveAdminIds])

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (submitted) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          finalizeSubmission('timeout')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [finalizeSubmission, submitted])

  // ── Integrity listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    if (submitted) return undefined

    const keyState = {
      ctrlOrMeta: false,
      alt: false,
      tab: false,
    }
    let lastKeyboardSwitchAt = 0

    const registerViolation = (reason, message, options = {}) => {
      if (options.preventDefault) {
        options.preventDefault.preventDefault()
      }
      setViolationCount((prev) => prev + 1)
      sendEvent('VIOLATION_DETECTED', { reason })
      addToast(message)
    }

    // Tab-switch detection
    const handleVisibility = () => {
      if (document.hidden) {
        registerViolation(
          'Tab switched / window hidden (possible Alt+Tab or app switch)',
          'Tab or window switch detected. This has been recorded.'
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
        registerViolation(
          'Copy shortcut attempt (Ctrl/Cmd+C)',
          'Copy shortcut detected. This has been recorded.',
          { preventDefault: e }
        )
        return
      }

      if (withModifier && key === 'v') {
        registerViolation(
          'Paste shortcut attempt (Ctrl/Cmd+V)',
          'Paste shortcut detected. This has been recorded.',
          { preventDefault: e }
        )
        return
      }

      if (e.altKey && key === 'tab') {
        registerViolation(
          'Windows app switch attempt (Alt+Tab)',
          'Alt+Tab switch attempt detected.',
          { preventDefault: e }
        )
        return
      }

      if (e.ctrlKey && key === 'tab') {
        lastKeyboardSwitchAt = Date.now()
        registerViolation(
          'Browser tab switch attempt (Ctrl+Tab)',
          'Ctrl+Tab switch attempt detected.',
          { preventDefault: e }
        )
        return
      }

      if ((e.metaKey || e.ctrlKey) && key === 'tab') {
        lastKeyboardSwitchAt = Date.now()
        registerViolation(
          'Keyboard tab switch attempt (Ctrl/Cmd+Tab)',
          'Keyboard tab switch attempt detected.',
          { preventDefault: e }
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

      registerViolation(
        'Keyboard-driven window/tab switch detected',
        'Keyboard tab/window switch detected. This has been recorded.'
      )
    }

    // Right-click prevention
    const handleContextMenu = (e) => {
      registerViolation(
        'Right-click attempt',
        'Right-click is disabled during the exam.',
        { preventDefault: e }
      )
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('keyup', handleKeyup)
    document.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('blur', handleWindowBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('keyup', handleKeyup)
      document.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [sendEvent, addToast, submitted])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
    sendEvent('QUESTION_NAVIGATED', { question_id: questionId, selected: option })
  }

  const handleSubmit = () => {
    finalizeSubmission('manual')
  }

  // ── Format mm:ss ────────────────────────────────────────────────────────────
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const timerUrgent = timeLeft < 300 // under 5 min

  // ── Submitted state ─────────────────────────────────────────────────────────
  if (submitted) {
    const sheet = resultSheet || buildResultSheet(answers, violationCount)

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl space-y-6 border border-gray-100">
          <div className="text-center space-y-2">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Exam Submitted</h2>
            <p className="text-gray-500">Your result sheet is generated and shared with the auditor dashboard.</p>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Result Sheet</h3>
            </div>
            <div className="divide-y divide-gray-100 text-sm">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-500">Student Name</span>
                <span className="font-semibold text-gray-900">{sheet.student_name}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-500">Score</span>
                <span className="font-semibold text-gray-900">{sheet.score} / {sheet.total_questions}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-500">Violations</span>
                <span className="font-semibold text-gray-900">{sheet.violations}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-500">Final Percentage</span>
                <span className="font-semibold text-gray-900">{sheet.final_percentage}%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-2.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-semibold"
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
