import { buildSitePresentation } from '../../src/lib/generated'

const formatTimestamp = (timestamp: string): string =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(timestamp))

export default function HistoryPage() {
  const { manifest, presentations } = buildSitePresentation()
  const items = [
    ...presentations.flatMap((presentation) => presentation.timeline),
    {
      id: 'cross-host-manifest',
      repo: 'oh-my-copilot',
      label: 'Cross-host manifest generated',
      timestamp: manifest.generatedAt,
      kind: 'history',
      detail: manifest.comparisonPolicy.summary,
      proofLink: 'apps/cross-host-benchmark-site/generated/manifest.json',
    },
  ].sort((left, right) => right.timestamp.localeCompare(left.timestamp))

  return (
    <section className="panel-stack flagship-stack">
      <section className="panel hero-panel">
        <p className="eyebrow">history</p>
        <h2>Generated history and process evidence stay reviewable.</h2>
        <p>
          Timeline entries mix repo-native benchmark runs, harvested snapshot artifacts, validation
          proofs, and the latest cross-host manifest generation event.
        </p>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">History entries</p>
          <p className="metric-value">{items.length}</p>
          <p className="metric-detail">Benchmark rows and process artifacts are rendered together.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Latest event</p>
          <p className="metric-value">{formatTimestamp(items[0].timestamp)}</p>
          <p className="metric-detail">Most recent event in the public evidence chronology.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Manifest proof</p>
          <p className="metric-value">generated/manifest.json</p>
          <p className="metric-detail">Cross-host policy snapshot remains linked as proof.</p>
        </article>
      </section>

      <section className="panel">
        <ol className="timeline-list">
          {items.map((item) => (
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
