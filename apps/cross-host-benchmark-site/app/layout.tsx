import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

const SITE_URL = 'https://peterponyu.github.io/oh-my-copilot/'
const SIBLING_URL = 'https://peterponyu.github.io/oh-my-cursor/'
const DOCS_URL = 'https://github.com/PeterPonyu/oh-my-copilot/blob/main/docs/benchmark-status.md'
const REFERENCES_URL = 'https://github.com/PeterPonyu/oh-my-copilot/blob/main/docs/references.md'

type NavItem = {
  href: string
  label: string
  kind: 'internal' | 'external'
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'oh-my-copilot — Copilot CLI-first benchmark evidence',
  description:
    'Flagship GitHub Pages surface for oh-my-copilot: methodology, history, benchmark evidence, and sibling-context links without claiming cross-host parity.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'oh-my-copilot — Copilot CLI-first benchmark evidence',
    description:
      'Flagship GitHub Pages surface for oh-my-copilot with visible methodology, history, proof links, and sibling-context navigation.',
    url: SITE_URL,
    siteName: 'oh-my-copilot',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'oh-my-copilot — Copilot CLI-first benchmark evidence',
    description:
      'CLI-first benchmark evidence with explicit methodology, history, and sibling-context links.',
  },
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Overview', kind: 'internal' },
  { href: '/methodology', label: 'Methodology', kind: 'internal' },
  { href: '/history', label: 'History', kind: 'internal' },
  { href: DOCS_URL, label: 'Benchmark docs', kind: 'external' },
  { href: REFERENCES_URL, label: 'References', kind: 'external' },
  { href: SIBLING_URL, label: 'Sibling: oh-my-cursor', kind: 'external' },
]

function NavLink({ item }: { item: NavItem }) {
  if (item.kind === 'internal') {
    return <Link href={item.href}>{item.label}</Link>
  }

  return (
    <a href={item.href} target="_blank" rel="noreferrer">
      {item.label}
    </a>
  )
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div className="site-header-copy">
              <p className="eyebrow">canonical public root</p>
              <h1>oh-my-copilot — Copilot CLI-first benchmark evidence</h1>
              <p className="site-intro">
                A flagship landing surface for repo-native benchmark storytelling: visible proof
                links, explicit methodology, and sibling comparison context without pretending the
                Copilot and Cursor repos share one implementation contract.
              </p>
            </div>
            <div className="header-actions">
              <a className="button button-secondary" href={SIBLING_URL} target="_blank" rel="noreferrer">
                View sibling context
              </a>
              <a className="button button-primary" href={DOCS_URL} target="_blank" rel="noreferrer">
                Open benchmark docs
              </a>
            </div>
            <nav aria-label="Primary">
              <ul className="nav-list">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
