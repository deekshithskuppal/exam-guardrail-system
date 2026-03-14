import { RefreshCw, ShieldCheck } from 'lucide-react'

export default function CaptchaField({
  captchaPrompt,
  captchaValue,
  onCaptchaChange,
  onRefresh,
  error,
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <ShieldCheck className="h-4 w-4 text-orange-700" />
            Human verification
          </div>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            Solve the challenge below to unlock the exam session.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:border-orange-400 hover:text-orange-700"
          aria-label="Refresh captcha"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-dashed border-amber-300 bg-white/90 px-4 py-3">
        <p className="font-display text-2xl font-semibold tracking-[0.18em] text-stone-900 sm:text-[1.7rem]">
          {captchaPrompt}
        </p>
      </div>

      <div>
        <label htmlFor="captcha" className="mb-1.5 block text-sm font-medium text-stone-800">
          Enter captcha result
        </label>
        <input
          id="captcha"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck="false"
          placeholder="Type your answer"
          value={captchaValue}
          onChange={(e) => onCaptchaChange(e.target.value)}
          className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          required
        />
        {error ? <p className="mt-2 text-sm font-medium text-red-700">{error}</p> : null}
      </div>
    </div>
  )
}