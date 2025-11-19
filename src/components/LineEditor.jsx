import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete, apiPut, apiUpload } from './API'

function Section({ title, children, actions }) {
  return (
    <div className="bg-white/80 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <div className="flex gap-2">{actions}</div>
      </div>
      {children}
    </div>
  )
}

export default function LineEditor() {
  const [lines, setLines] = useState([])
  const [selected, setSelected] = useState(null)
  const [newLineName, setNewLineName] = useState('')
  const [scheduleText, setScheduleText] = useState('07:30,08:00,08:30')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    const data = await apiGet('/api/lines')
    setLines(data)
    if (selected) {
      const match = data.find(l => l.id === selected.id)
      setSelected(match || null)
    }
  }

  async function createLine() {
    if (!newLineName.trim()) return
    const res = await apiPost('/api/lines', { name: newLineName, description: '', stops: [], schedules: [] })
    setNewLineName('')
    await refresh()
    const created = (await apiGet('/api/lines')).find(l => l.id === res.id)
    setSelected(created)
  }

  async function addStop() {
    if (!selected) return
    await apiPost(`/api/lines/${selected.id}/stops`, { name: `Fermata ${selected.stops.length + 1}`, travel_minutes_from_prev: 3 })
    await refresh()
  }

  async function updateStop(idx, patch) {
    if (!selected) return
    await apiPatch(`/api/lines/${selected.id}/stops`, { index: idx, ...patch })
    await refresh()
  }

  async function deleteStop(idx) {
    if (!selected) return
    await apiDelete(`/api/lines/${selected.id}/stops`, { index: idx })
    await refresh()
  }

  async function setSchedules() {
    if (!selected) return
    const schedules = scheduleText.split(/[\n,;\s]+/).map(s => s.trim()).filter(Boolean)
    await apiPut(`/api/lines/${selected.id}/schedules`, { schedules })
    await refresh()
  }

  async function uploadImage() {
    if (!file) return
    setLoading(true)
    try {
      const parsed = await apiUpload('/api/ocr/upload', file)
      if (selected) {
        // merge stops
        for (const s of parsed.stops) {
          await apiPost(`/api/lines/${selected.id}/stops`, s)
        }
        await apiPut(`/api/lines/${selected.id}/schedules`, { schedules: parsed.schedules })
        await refresh()
      } else {
        // create new line with parsed data
        const res = await apiPost('/api/lines', { name: 'Linea OCR', description: 'Importata da immagine', stops: parsed.stops, schedules: parsed.schedules })
        await refresh()
        const created = (await apiGet('/api/lines')).find(l => l.id === res.id)
        setSelected(created)
      }
    } finally {
      setLoading(false)
    }
  }

  const totalMinutes = useMemo(() => {
    if (!selected) return 0
    return (selected.stops || []).reduce((acc, s) => acc + (s.travel_minutes_from_prev || 0), 0)
  }, [selected])

  return (
    <div className={`transition-all ${fullscreen ? 'fixed inset-0 z-50 p-4 bg-slate-900' : ''}`}>
      <div className="flex flex-col gap-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Atomo10</h2>
          <div className="flex gap-2">
            <button onClick={() => setFullscreen(v => !v)} className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-700">
              {fullscreen ? 'Esci Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        <Section title="Linee" actions={(
          <div className="flex gap-2">
            <input value={newLineName} onChange={e => setNewLineName(e.target.value)} placeholder="Nuova linea" className="px-3 py-2 rounded-lg border" />
            <button onClick={createLine} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Crea</button>
          </div>
        )}>
          <div className="flex gap-2 overflow-x-auto">
            {lines.map(line => (
              <button key={line.id} onClick={() => setSelected(line)} className={`px-3 py-2 rounded-lg border ${selected?.id === line.id ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                {line.name}
              </button>
            ))}
          </div>
        </Section>

        {selected && (
          <>
            <Section title={`Fermate - ${selected.name}`} actions={(
              <button onClick={addStop} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Aggiungi fermata</button>
            )}>
              <div className="space-y-2">
                {(selected.stops || []).map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input value={s.name} onChange={e => updateStop(idx, { name: e.target.value })} className="px-3 py-2 rounded-lg border w-64" />
                    <input type="number" min={0} value={s.travel_minutes_from_prev || 0} onChange={e => updateStop(idx, { travel_minutes_from_prev: parseInt(e.target.value || '0', 10) })} className="px-3 py-2 rounded-lg border w-48" />
                    <span className="text-sm text-slate-500">min dal precedente</span>
                    <button onClick={() => deleteStop(idx)} className="ml-auto px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Elimina</button>
                  </div>
                ))}
                {selected.stops?.length === 0 && (
                  <p className="text-slate-500">Nessuna fermata. Aggiungine una per iniziare.</p>
                )}
              </div>
              <div className="mt-3 text-sm text-slate-600">Tempo totale percorso: <span className="font-semibold">{totalMinutes} min</span></div>
            </Section>

            <Section title="Orari" actions={(
              <button onClick={setSchedules} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Salva orari</button>
            )}>
              <textarea value={scheduleText} onChange={e => setScheduleText(e.target.value)} rows={3} placeholder="Inserisci orari separati da virgola o spazio (es. 07:30 08:00 08:30)" className="w-full px-3 py-2 rounded-lg border" />
              {selected.schedules && selected.schedules.length > 0 && (
                <div className="mt-3 text-sm">
                  <span className="font-semibold">Correnti:</span> {selected.schedules.join(', ')}
                </div>
              )}
            </Section>

            <Section title="Importa da immagine (OCR)" actions={(
              <button disabled={!file || loading} onClick={uploadImage} className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">{loading ? 'Elaboro...' : 'Carica e analizza'}</button>
            )}>
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
              <p className="text-sm text-slate-500 mt-2">Carica una foto della tabella con fermate e orari: l'app estrarrà automaticamente tempi e orari.</p>
            </Section>

            <Section title="Arrivi stimati (ETA)">
              <EtaView line={selected} />
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

function EtaView({ line }) {
  const [etas, setEtas] = useState([])

  useEffect(() => {
    if (!line) return
    (async () => {
      const data = await apiGet(`/api/lines/${line.id}/eta?from_stop_index=0`)
      setEtas(data.etas || [])
    })()
  }, [line])

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr>
            <th className="p-2">Fermata</th>
            <th className="p-2">Arrivi</th>
          </tr>
        </thead>
        <tbody>
          {etas.map((e, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2 font-medium">{e.stop}</td>
              <td className="p-2">{(e.arrivals || []).join(' • ')}</td>
            </tr>
          ))}
          {etas.length === 0 && (
            <tr>
              <td className="p-2 text-slate-500" colSpan={2}>Nessun orario disponibile</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
