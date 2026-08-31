import type { Metadata } from 'next'
import './globals.css'
import './clue-overrides.css'

export const metadata: Metadata = {
  title: 'Clue',
  description: 'A calm, powerful AI workspace.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
