/**
 * AdminLogin.jsx — Auditor / administrator login screen.
 *
 * Same dark full-screen layout as the student login, but with
 * username + password fields and an ACCESS DASHBOARD button.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, LogIn } from 'lucide-react'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    // Navigate to dashboard — in production this would hit an auth endpoint
    navigate('/dashboard', { state: { adminId: username } })
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 opacity-80" />
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} />

      <div className="relative max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-700/30">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">SENTINEL</h1>
              <p className="text-sm text-gray-500 mt-1">Auditor Access Portal</p>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm
                           focus:ring-2 focus:ring-blue-600 focus:border-transparent
                           outline-none transition-all placeholder:text-gray-400"
                required
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              <LogIn className="w-4 h-4" />
              ACCESS DASHBOARD
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            Authorized personnel only
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Secured by SENTINEL Monitoring System
        </p>
      </div>
    </div>
  )
}
