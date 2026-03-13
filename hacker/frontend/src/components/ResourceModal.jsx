/**
 * ResourceModal.jsx — Admin modal for managing external resources.
 *
 * Fetches resources from /api/v1/resources on open.
 * Supports adding (POST) and deleting (DELETE) resources.
 */

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react'

const API = 'http://localhost:8000/api/v1/resources'

export default function ResourceModal({ isOpen, onClose }) {
  const [resources, setResources] = useState([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Fetch resources when the modal opens ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    fetchResources()
  }, [isOpen])

  const fetchResources = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/`)
      if (res.ok) setResources(await res.json())
    } catch (err) {
      console.error('Failed to fetch resources:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    try {
      const res = await fetch(`${API}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, is_active: true }),
      })
      if (res.ok) {
        const created = await res.json()
        setResources((prev) => [...prev, created])
        setTitle('')
        setUrl('')
      }
    } catch (err) {
      console.error('Failed to add resource:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' })
      setResources((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete resource:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Manage Resources</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              required
            />
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm
                         focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold
                       py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </button>
        </form>

        {/* Resource list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {!loading && resources.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No resources added yet.</p>
          )}
          {resources.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg
                         border border-gray-100 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                  <p className="text-xs text-gray-400 truncate">{r.url}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-600
                           hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
