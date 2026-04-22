import Link from 'next/link'
import { buildSitePresentation } from '../src/lib/generated'

const DOC_LINKS = [
  {
    href: 'https://github.com/PeterPonyu/oh-my-copilot/blob/main/README.md',
    label: 'README',
    detail: 'Public repo overview, Copilot CLI-first scope, and current evidence framing.',
  },
  {
    href: 'https://github.com/PeterPonyu/oh-my-copilot/blob/main/docs/state-contract.md',
    label: 'State contract',
    detail: 'Boundary proof for repo-owned surfaces, install state, and validation expectations.',
  },
  {
    href: 'https://github.com/PeterPonyu/oh-my-copilot/blob/main/docs/references.md',
    label: 'References',
    detail: 'GitHub-source-backed citations for Copilot host-product and comparison-scoped wording.',
  },
  {
    href: 'https://github.com/PeterPonyu/oh-my-copilot/blob/main/benchmark/README.md',
    label: 'Benchmark notes',
    detail: 'Repo-native benchmark contract, harness notes, and release-gate context.',
  },
] as const

const SIBLING_URL = 'https://peterponyu.github.io/oh-my-cursor/'

const formatTimestamp = (timestamp: string): string =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(timestamp))

export default function HomePage() {
  const { compare, manifest, presentations } = buildSitePresentation()
  const evidencePreview = [...presentations.flatMap((presentation) => presentation.timeline)]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 6)

  return (
    <section className="panel-stack flagship-stack">
      <section className="panel hero-panel hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">canonical public root</p>
          <h2>Truthful Copilot benchmark evidence, not fake parity.</h2>
          <p>
            This <strong>isolated presentation boundary</strong> keeps Copilot and Cursor in their
            own <strong>repo-native</strong> score models while making the shared view explicitly{' '}
            <strong>{manifest.comparisonPolicy.currentPairingClass}</strong>.
          </p>
          <p>{compare.warning}</p>
          <div className="action-row">
            <Link href="/methodology" className="action-link action-link--primary">
              Review methodology
            </Link>
            <Link href="/history" className="action-link">
              Trace history
            </Link>
            <a href={DOC_LINKS[0].href} target="_blank" rel="noreferrer" className="action-link">
              Open docs & proof
            </a>
            <a href={SIBLING_URL} target="_blank" rel="noreferrer" className="action-link">
              Sibling context: oh-my-cursor
            </a>
          </div>
        </div>

        <div className="hero-rail">
          <article className="metric-card">
            <p className="metric-label">Current pairing</p>
            <p className="metric-value">
              {manifest.captureSkew.comparisonPair.copilot} vs{' '}
              {manifest.captureSkew.comparisonPair.cursor}
            </p>
            <p className="metric-detail">Latest harvested pair stays reporting-comparable.</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Capture skew</p>
            <p className="metric-value">{manifest.captureSkew.minutes.toFixed(2)} minutes</p>
            <p className="metric-detail">
              {manifest.captureSkew.seconds} seconds between the latest Copilot and Cursor records.
            </p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Export shell</p>
            <p className="metric-value">Next 16 static export</p>
            <p className="metric-detail">The proven Pages workflow and out/ build contract stay intact.</p>
          </article>
        </div>
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">landing evidence rails</p>
          <h3>Visible routes and proof entry points stay above the fold.</h3>
        </div>
        <p>
          Methodology and History remain first-class routes, while GitHub-hosted docs and benchmark
          notes stay one click away from the landing surface.
        </p>
      </section>

      <section className="card-grid card-grid--wide">
        <article className="panel link-panel">
          <p className="eyebrow">Route</p>
          <h3>Methodology</h3>
          <p>
            Inspect allowed comparability classes, repo-level provenance, and why reporting-
            comparable rows do not claim mechanism equivalence.
          </p>
          <Link href="/methodology" className="text-link">
            Open methodology →
          </Link>
        </article>

        <article className="panel link-panel">
          <p className="eyebrow">Route</p>
          <h3>History</h3>
          <p>
            Review benchmark runs, validation artifacts, and the generated manifest event in a
            single chronology.
          </p>
          <Link href="/history" className="text-link">
            Open history →
          </Link>
        </article>

        <article className="panel link-panel">
          <p className="eyebrow">Proof surface</p>
          <h3>Docs & repo proof</h3>
          <ul className="link-list">
            {DOC_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer" className="text-link">
                  {link.label}
                </a>
                <p>{link.detail}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">repo-native comparative readout</p>
          <h3>Sibling coherence without collapsing the scoring models.</h3>
        </div>
        <p>
          Each card explains advantage inside its own harness first, then labels cross-host context
          as reporting-comparable rather than mechanism-equivalent parity.
        </p>
      </section>

      <section className="card-grid">
        {compare.cards.map((card) => (
          <article key={card.repo} className="panel compare-card">
            <p className="eyebrow">{card.displayName}</p>
            <h3>{card.deltaLabel ? `${card.deltaLabel} repo-native delta` : 'Repo-native baseline'}</h3>
            <p>{card.headline}</p>
            <p className="badge-row">
              <span className="badge">{card.comparabilityClass}</span>
            </p>
            <p>{card.supportingDetail}</p>
          </article>
        ))}
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">state confidence</p>
          <h3>Named proof links remain visible alongside score summaries.</h3>
        </div>
        <p>
          The flagship surface highlights required checks, timestamps, and proof links instead of
          turning benchmark output into marketing-only copy.
        </p>
      </section>

      <section className="card-grid">
        {presentations.map((presentation) => (
          <article key={presentation.repo} className="panel state-panel">
            <p className="eyebrow">{presentation.displayName}</p>
            <h3>{presentation.stateConfidence.label}</h3>
            <p>{presentation.plainLanguageSummary}</p>
            <p className="badge-row">
              <span
                className={`badge badge--${presentation.stateConfidence.tone}`}
              >{`${presentation.stateConfidence.requiredPassed}/${presentation.stateConfidence.requiredTotal} required checks passing`}</span>
            </p>
            <ul className="check-list proof-list">
              {presentation.stateConfidence.rows.map((row) => (
                <li key={`${presentation.repo}-${row.name}`}>
                  <strong>{row.label}</strong> — {row.summary}
                  <div className="proof-meta">
                    <span className={`status-pill status-pill--${row.status}`}>{row.status}</span>
                    <span>{formatTimestamp(row.timestamp)}</span>
                    <span className="proof-link">Proof: {row.proofLink}</span>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">recent evidence</p>
          <h3>Generated history stays part of the public story.</h3>
        </div>
        <p>
          These recent entries keep benchmark runs and validation artifacts visible from the
          homepage before a reader ever leaves the landing surface.
        </p>
      </section>

      <section className="panel">
        <ol className="timeline-list">
          {evidencePreview.map((item) => (
            <li key={item.id} className="timeline-item">
              <p className="eyebrow">
                {formatTimestamp(item.timestamp)} · {item.kind}
              </p>
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
              <p className="proof-link">Proof: {item.proofLink}</p>
            </li>
          ))}
        </ol>
      </section>
    </section>
  )
}
