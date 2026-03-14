/**
 * AdminLogin.jsx — Teacher login screen.
 *
 * Same dark full-screen layout as the student login, but with
 * username + password fields and an ACCESS DASHBOARD button.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, LogIn, Sunrise } from 'lucide-react'
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

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
    if (!username.trim() || !password.trim()) return
    if (captchaValue.trim() !== captcha.answer) {
      setCaptchaError('Captcha does not match. Please try again.')
      refreshCaptcha()
      return
    }
    // Navigate to dashboard — in production this would hit an auth endpoint
    navigate('/dashboard', { state: { adminId: username, teacherId: username, role: 'teacher' } })
  }

  return (
    <AuthShell
      icon={Sunrise}
      badge="Teacher Access"
      title="Review sessions from a login flow that feels formal, readable, and controlled."
      description="Teacher sign-in now follows the same sunrise visual system as the student portal, with clearer spacing, stronger contrast, and a required captcha checkpoint."
      panelTitle="Operator guidance"
      panelDescription="Use this portal only for approved teaching oversight activity. Enter your credentials, complete verification, and continue into the monitoring dashboard."
      highlights={[
        {
          label: 'Focused design',
          title: 'Professional control surface',
          text: 'The updated card layout reduces visual noise while keeping key labels and actions obvious.',
        },
        {
          label: 'Session safety',
          title: 'Manual entry verification',
          text: 'A simple captcha adds an extra check before dashboard access without depending on third-party services.',
        },
      ]}
      footer="Authorized teachers only. Every dashboard session should begin with explicit identity verification."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-display text-3xl font-bold tracking-[-0.03em] text-stone-950">
            Teacher Portal
          </h2>
          <p className="max-w-md text-sm leading-6 text-stone-600">
            Sign in with your assigned teacher credentials, then complete the human verification challenge to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-username" className="mb-1.5 block text-sm font-medium text-stone-800">
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              placeholder="Enter teacher username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              required
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-stone-800">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              required
            />
          </div>

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

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#7c2d12,#c2410c,#fb923c)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(154,52,18,0.28)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_rgba(154,52,18,0.34)] focus:outline-none focus:ring-4 focus:ring-orange-200"
          >
            <LogIn className="h-4 w-4" />
            Access Dashboard
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
