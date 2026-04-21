const WORKSPACE_CONTRACT = [
  'Self-contained Next.js App Router workspace under apps/cross-host-benchmark-site',
  'Static export build contract via next.config.ts output export',
  'Canonical build command remains pnpm --dir apps/cross-host-benchmark-site build',
  'Generated snapshot inputs will live under generated/ and feed later presentation routes',
]

export default function HomePage() {
  return (
    <section className="panel-stack">
      <section className="panel hero-panel">
        <p className="eyebrow">tranche one</p>
        <h2>Static-first Next.js scaffold is in place.</h2>
        <p>
          This workspace establishes the isolated presentation boundary for the cross-host benchmark
          site without introducing an extra export step.
        </p>
      </section>

      <section className="panel">
        <h3>Scaffold guarantees</h3>
        <ul className="check-list">
          {WORKSPACE_CONTRACT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel two-column-grid">
        <article>
          <h3>Ready for harvest work</h3>
          <p>
            The app currently renders static placeholder content only. Follow-on tasks can add
            generated snapshots, adapters, and evidence-backed views without changing the build
            contract.
          </p>
        </article>
        <article>
          <h3>Ready for presentation work</h3>
          <p>
            The root layout, navigation shell, and exported CSS baseline provide a stable surface for
            methodology, history, and comparison routes.
          </p>
        </article>
      </section>
    </section>
  )
}
