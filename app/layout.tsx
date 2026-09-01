import type { Metadata } from 'next'
import './globals.css'
import './clue-overrides.css'
import './clue-live.css'

export const metadata: Metadata = {
  title: 'Clue',
  description: 'A calm, powerful AI workspace.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
