import { buildSitePresentation } from '../../src/lib/generated'

export default function MethodologyPage() {
  const { manifest } = buildSitePresentation()

  return (
    <section className="panel-stack">
      <section className="panel">
        <p className="eyebrow">methodology</p>
        <h2>Comparability classes are part of the proof contract.</h2>
        <p>
          The shared site only reports side-by-side rows when the generated data says how comparable
          they are. Current Copilot/Cursor benchmark rows stay observed and default to{' '}
          <strong>{manifest.comparisonPolicy.currentPairingClass}</strong>.
        </p>
      </section>

      <section className="panel">
        <h3>Allowed comparability classes</h3>
        <p>
          The canonical set is <strong>outcome-comparable</strong>,{' '}
          <strong>reporting-comparable</strong>, and <strong>not-comparable</strong>. The current
          Copilot/Cursor pairing stays reporting-comparable until row-level proof supports anything
          stronger.
        </p>
        <ul className="check-list">
          {manifest.comparisonPolicy.allowedComparabilityClasses.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      </section>

      <section className="card-grid">
        {manifest.repos.map((repo) => (
          <article key={repo.repo} className="panel">
            <p className="eyebrow">{repo.repo}</p>
            <h3>{repo.comparabilityClass}</h3>
            <p>{repo.comparabilityNote}</p>
            <ul className="check-list">
              <li>
                Source branch/SHA: {repo.sourceBranch}@{repo.sourceSha}
              </li>
              <li>
                Workspace branch/SHA: {repo.workspaceBranch}@{repo.workspaceSha}
              </li>
              <li>Snapshot proof: {repo.snapshotPath}</li>
              <li>History source: {repo.historyPath}</li>
            </ul>
          </article>
        ))}
      </section>
    </section>
  )
}
