import { buildSitePresentation } from '../../src/lib/generated'

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
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp))

  return (
    <section className="panel-stack">
      <section className="panel">
        <p className="eyebrow">history</p>
        <h2>Generated history and process evidence</h2>
        <p>
          Timeline entries mix repo-native benchmark runs, harvested snapshot artifacts, and the
          latest cross-host manifest generation event.
        </p>
      </section>

      <section className="panel">
        <ol className="timeline-list">
          {items.map((item) => (
            <li key={item.id} className="timeline-item">
              <p className="eyebrow">
                {item.timestamp} · {item.kind}
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
