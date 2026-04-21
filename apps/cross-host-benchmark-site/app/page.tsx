import { buildSitePresentation } from '../src/lib/generated'

export default function HomePage() {
  const { compare, manifest, presentations } = buildSitePresentation()

  return (
    <section className="panel-stack">
      <section className="panel hero-panel">
        <p className="eyebrow">overview</p>
        <h2>Observed rows, truthful comparability.</h2>
        <p>
          This isolated presentation boundary keeps Copilot and Cursor in their own repo-native
          score models. Each harvested row stays <strong>observed</strong> while the shared view
          explicitly marks the current pairing as{' '}
          <strong>{manifest.comparisonPolicy.currentPairingClass}</strong>.
        </p>
        <p>{compare.warning}</p>
      </section>

      <section className="panel">
        <h3>Current comparison policy</h3>
        <ul className="check-list">
          <li>Comparison class stays {manifest.comparisonPolicy.comparisonClass} for harvested rows.</li>
          <li>{manifest.comparisonPolicy.summary}</li>
          <li>
            Capture skew between the current comparison pair is {manifest.captureSkew.seconds} seconds
            ({manifest.captureSkew.minutes} minutes).
          </li>
          <li>
            Current pair: Copilot {manifest.captureSkew.comparisonPair.copilot} vs Cursor{' '}
            {manifest.captureSkew.comparisonPair.cursor}.
          </li>
        </ul>
      </section>

      <section className="card-grid">
        {compare.cards.map((card) => (
          <article key={card.repo} className="panel">
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

      <section className="card-grid">
        {presentations.map((presentation) => (
          <article key={presentation.repo} className="panel">
            <p className="eyebrow">{presentation.displayName}</p>
            <h3>State confidence</h3>
            <p>{presentation.plainLanguageSummary}</p>
            <ul className="check-list">
              {presentation.scoreCards.map((card) => (
                <li key={card.id}>
                  <strong>
                    {card.profile}/{card.variant}
                  </strong>{' '}
                  — {card.scoreLabel} with {card.gateLabel} and {card.comparabilityClass} semantics.
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </section>
  )
}
