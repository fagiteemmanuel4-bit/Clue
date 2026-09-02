import type { Metadata } from 'next'
import './globals.css'
import './clue-overrides.css'
import './clue-live.css'
import './file-workspace.css'
import './history-menu-fix.css'
import './workspace-tools.css'
import './voice-tools.css'
import FileWorkspaceDock from './components/file-workspace-dock'
import SourceCardsBridge from './components/source-cards-bridge'
import CanvasAutosave from './components/canvas-autosave'

export const metadata: Metadata = { title: 'Clue', description: 'A calm, powerful AI workspace.' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<FileWorkspaceDock/><SourceCardsBridge/><CanvasAutosave/></body></html>
}
