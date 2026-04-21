import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cross-host benchmark evidence',
  description:
    'Static-first presentation of cross-host benchmark evidence, repo-native scorecards, and truthful comparability metadata.',
}

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/history', label: 'History' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div>
              <p className="eyebrow">cross-host benchmark</p>
              <h1>Cross-host benchmark evidence</h1>
            </div>
            <nav aria-label="Primary">
              <ul className="nav-list">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
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
