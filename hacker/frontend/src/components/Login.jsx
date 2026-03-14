/**
 * Login.jsx — Student login screen.
 *
 * Full-screen dark layout with a centered white card.
 * Collects student name + ID, then navigates to /exam with state.
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, ArrowRight, BookOpen, Sparkles, SunMedium } from 'lucide-react'
import AuthShell from './AuthShell'
import CaptchaField from './CaptchaField'

function createCaptchaChallenge() {
  const left = Math.floor(Math.random() * 8) + 2
  const right = Math.floor(Math.random() * 8) + 2
  return {
    prompt: `${left} + ${right}`,
    answer: String(left + right),
  }
}

export default function Login() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [adminId, setAdminId] = useState('')
  const [captcha, setCaptcha] = useState(() => createCaptchaChallenge())
  const [captchaValue, setCaptchaValue] = useState('')
  const [captchaError, setCaptchaError] = useState('')

  const refreshCaptcha = () => {
    setCaptcha(createCaptchaChallenge())
    setCaptchaValue('')
    setCaptchaError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fullName.trim() || !studentId.trim() || !adminId.trim()) return
    if (captchaValue.trim() !== captcha.answer) {
      setCaptchaError('Captcha does not match. Please try again.')
      refreshCaptcha()
      return
    }
    const adminIds = adminId
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    // Navigate to exam view, passing student info via router state
    navigate('/exam', {
      state: {
        fullName,
        studentId,
        adminId: adminIds[0] || '',
        adminIds,
      },
    })
  }

  return (
    <AuthShell
      icon={SunMedium}
      badge="Student Access"
      title="Enter a monitored exam space with a clear, low-friction start."
      description="The sign-in flow now uses a sunrise palette for calmer focus, stronger readability, and a quick captcha check before an exam session begins."
      panelTitle="Before you begin"
      panelDescription="Use the assigned administrator username, confirm your student identity, and complete the verification prompt. This creates a cleaner handoff into the monitored exam environment."
      highlights={[
        {
          label: 'Readable UI',
          title: 'High-contrast fields',
          text: 'Warm neutrals and dark text keep labels, inputs, and alerts legible in bright screens and long sessions.',
        },
        {
          label: 'Verification',
          title: 'Inline captcha gate',
          text: 'A refreshable math challenge blocks casual automated entry without interrupting the login flow.',
        },
      ]}
      footer="SENTINEL maintains an integrity-first entrance flow for every candidate session."
      bottomContent={(
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-orange-200 bg-orange-50/70 px-3 py-2 text-center font-semibold text-orange-900">
              Student Login
            </div>
            <Link
              to="/teacher"
              className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-center font-semibold text-amber-900 transition hover:bg-amber-50"
            >
              Teacher Login
            </Link>
          </div>
          <p className="text-center text-sm text-stone-600">
            Are you a teacher?{' '}
            <Link to="/teacher" className="font-semibold text-orange-800 transition hover:text-orange-700 hover:underline">
              Open Teacher Portal
            </Link>
          </p>
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-orange-800">
            <Sparkles className="h-3.5 w-3.5" />
            Secure exam login
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold tracking-[-0.03em] text-stone-950">
              Candidate Sign In
            </h2>
            <p className="max-w-md text-sm leading-6 text-stone-600">
              Enter your identity details exactly as issued. The captcha step must be completed before the exam environment opens.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-stone-800">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                required
              />
            </div>

            <div>
              <label htmlFor="studentId" className="mb-1.5 block text-sm font-medium text-stone-800">
                Student ID
              </label>
              <input
                id="studentId"
                type="text"
                placeholder="e.g. STU-2024-001"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                required
              />
            </div>

            <div>
              <label htmlFor="adminId" className="mb-1.5 block text-sm font-medium text-stone-800">
                Administrator Username(s)
              </label>
              <input
                id="adminId"
                type="text"
                placeholder="admin1 or admin1, admin2"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <CaptchaField
                captchaPrompt={captcha.prompt}
                captchaValue={captchaValue}
                onCaptchaChange={(value) => {
                  setCaptchaValue(value)
                  if (captchaError) setCaptchaError('')
                }}
                onRefresh={refreshCaptcha}
                error={captchaError}
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#9a3412,#ea580c,#fb923c)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(194,65,12,0.28)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_rgba(194,65,12,0.34)] focus:outline-none focus:ring-4 focus:ring-orange-200"
          >
            <BookOpen className="h-4 w-4" />
            Start Exam
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
