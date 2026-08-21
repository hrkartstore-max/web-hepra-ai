import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms/definitions";

const STEPS = [
  { n: "01", title: "Describe your website", body: "Tell HEPRA what you're building — audience, pages, brand style." },
  { n: "02", title: "Upload reference images", body: "Drop in screenshots or mood-board images the AI should draw from." },
  { n: "03", title: "Select platform", body: "Shopify, WordPress, or plain PHP — pick the stack your client needs." },
  { n: "04", title: "Generate website", body: "The AI plans, writes, and validates real project files, live." },
  { n: "05", title: "Watch progress", body: "See each generation stage: planning, writing, validating, done." },
  { n: "06", title: "Open the dashboard", body: "Browse the file tree, edit any file, save your changes." },
  { n: "07", title: "Preview it", body: "Check the generated entry file across breakpoints." },
  { n: "08", title: "Download ZIP", body: "Get the complete, extractable project — ready to deploy." },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #D4FA5C, transparent 60%)" }}
      />

      <header className="relative flex items-center justify-between max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-dark font-extrabold">
            H
          </span>
          <span className="font-bold tracking-tight">HEPRA</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary text-sm">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Create Website
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-primary/80 mb-4">
          AI Website Builder
        </p>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
          Build Websites With AI
        </h1>
        <p className="text-white/60 text-lg mt-5 max-w-xl mx-auto">
          Describe your website. Upload references. Let AI build the complete website.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link href="/register" className="btn-primary">
            Create Website
          </Link>
          <Link href="/projects" className="btn-secondary">
            View Projects
          </Link>
        </div>
      </section>

      {/* Platform selection */}
      <section className="relative max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-center text-sm uppercase tracking-widest text-muted mb-8">
          Three platforms, one workflow
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {PLATFORM_LIST.map((p) => (
            <div key={p.id} className="glass rounded-xl2 p-5">
              <h3 className="font-semibold mb-1">{p.label}</h3>
              <p className="text-sm text-muted mb-3">{p.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.capabilities.map((c) => (
                  <span
                    key={c}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative max-w-5xl mx-auto px-6 pb-28">
        <h2 className="text-center text-sm uppercase tracking-widest text-muted mb-10">
          How it works
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl2 border border-border p-5">
              <span className="text-primary/70 text-xs font-mono">{s.n}</span>
              <h3 className="font-semibold mt-2 mb-1.5">{s.title}</h3>
              <p className="text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-3xl mx-auto px-6 pb-28 text-center">
        <div className="glass rounded-xl2 p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to generate your first website?</h2>
          <p className="text-muted mb-6">
            Create an account and generate a real, downloadable project in minutes.
          </p>
          <Link href="/register" className="btn-primary">
            Generate Website
          </Link>
        </div>
      </section>

      <footer className="relative border-t border-border py-8 text-center text-xs text-muted">
        © {new Date().getFullYear()} HEPRA. All rights reserved.
      </footer>
    </main>
  );
}
