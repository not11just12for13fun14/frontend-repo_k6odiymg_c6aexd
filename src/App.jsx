import { useEffect, useState } from 'react'
import LineEditor from './components/LineEditor'

function App() {
  const [lang, setLang] = useState('it')

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur bg-slate-900/60">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
          <div className="text-xl font-bold">Atomo10</div>
          <div className="flex items-center gap-2">
            <select value={lang} onChange={e => setLang(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1">
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </header>

      <main className="p-4">
        <LineEditor />
      </main>

      <footer className="p-4 text-center text-slate-400">
        © {new Date().getFullYear()} Atomo10 · Gestione linee autobus
      </footer>
    </div>
  )
}

export default App
