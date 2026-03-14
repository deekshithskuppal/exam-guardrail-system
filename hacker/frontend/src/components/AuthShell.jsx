import { ArrowRight, CheckCircle2 } from 'lucide-react'

export default function AuthShell({
  icon: Icon,
  badge,
  title,
  description,
  panelTitle,
  panelDescription,
  highlights,
  footer,
  children,
  bottomContent,
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,244,214,0.96),_rgba(255,216,173,0.92)_28%,_rgba(253,186,116,0.82)_48%,_rgba(123,63,36,0.94)_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0)_24%,rgba(120,53,15,0.18)_72%,rgba(41,23,12,0.34)_100%)]" />
      <div className="pointer-events-none absolute -left-16 top-[-3.5rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,250,225,0.98)_0%,_rgba(255,215,148,0.95)_42%,_rgba(255,185,104,0.12)_72%,_transparent_73%)] blur-sm sunrise-float" />
      <div className="pointer-events-none absolute right-[-5rem] top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,247,230,0.52)_0%,_rgba(255,225,179,0.26)_38%,_transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,rgba(120,53,15,0)_0%,rgba(68,35,20,0.22)_36%,rgba(41,23,12,0.72)_100%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/40 bg-[linear-gradient(145deg,rgba(255,252,246,0.5),rgba(255,247,237,0.18))] p-6 shadow-[0_24px_80px_rgba(120,53,15,0.16)] backdrop-blur md:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0))]" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="space-y-6">
                <div className="inline-flex w-fit items-center gap-3 rounded-full border border-amber-900/10 bg-white/72 px-4 py-2 shadow-sm backdrop-blur">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#9a3412,#f97316)] text-white shadow-[0_12px_30px_rgba(194,65,12,0.35)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-amber-900/60">{badge}</p>
                    <p className="text-sm font-semibold text-stone-800">Verified entrance flow</p>
                  </div>
                </div>

                <div className="max-w-xl space-y-4">
                  <h1 className="font-display text-4xl font-bold tracking-[-0.04em] text-stone-950 sm:text-5xl">
                    {title}
                  </h1>
                  <p className="max-w-lg text-base leading-7 text-stone-700 sm:text-lg">
                    {description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {highlights.map((highlight) => (
                    <div
                      key={highlight.title}
                      className="rounded-2xl border border-white/55 bg-white/78 p-4 shadow-[0_12px_34px_rgba(120,53,15,0.08)]"
                    >
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-amber-800/70">
                        {highlight.label}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-stone-900">{highlight.title}</p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">{highlight.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 rounded-[1.75rem] border border-amber-950/10 bg-stone-950/90 p-5 text-amber-50 shadow-[0_18px_44px_rgba(28,25,23,0.34)] sm:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-amber-200/80">
                    {panelTitle}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-amber-50/80">
                    {panelDescription}
                  </p>
                </div>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-50">
                    <CheckCircle2 className="h-4 w-4 text-amber-300" />
                    Trusted session controls
                  </div>
                  <div className="flex items-center justify-between text-sm text-amber-100/85">
                    <span>Identity check</span>
                    <span>Captcha</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-amber-100/85">
                    <span>Readability</span>
                    <span>AA contrast</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-amber-100/85">
                    <span>Flow</span>
                    <span className="inline-flex items-center gap-1 text-amber-200">Ready <ArrowRight className="h-3.5 w-3.5" /></span>
                  </div>
                </div>
              </div>

              <p className="text-sm font-medium text-stone-800/80">{footer}</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/55 bg-white/82 p-5 shadow-[0_24px_80px_rgba(120,53,15,0.16)] backdrop-blur md:p-8">
            {children}
            {bottomContent ? <div className="mt-6">{bottomContent}</div> : null}
          </section>
        </div>
      </div>
    </div>
  )
}