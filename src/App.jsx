import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function App() {
  const [pobles, setPobles] = useState([])
  const [camps, setCamps] = useState([])
  const [zones, setZones] = useState([])
  const [pobleSeleccionat, setPobleSeleccionat] = useState(null)
  const [campSeleccionat, setCampSeleccionat] = useState(null)
  const [carregant, setCarregant] = useState(true)

  useEffect(() => {
    carregaPobles()
  }, [])

  async function carregaPobles() {
    const { data } = await supabase.from('pobles').select('*').order('nom')
    setPobles(data || [])
    setCarregant(false)
  }

  async function seleccionaPoble(poble) {
    setPobleSeleccionat(poble)
    setCampSeleccionat(null)
    setZones([])
    const { data } = await supabase
      .from('camps')
      .select('*')
      .eq('poble_id', poble.id)
      .order('nom')
    setCamps(data || [])
  }

  async function seleccionaCamp(camp) {
    setCampSeleccionat(camp)
    const { data } = await supabase
      .from('zones')
      .select('*')
      .eq('camp_id', camp.id)
      .order('codi')
    setZones(data || [])
  }

  if (carregant) return (
    <div style={styles.centrat}>
      <p style={styles.carregant}>Carregant...</p>
    </div>
  )

  return (
    <div style={styles.app}>
      <div style={styles.capçalera}>
        <h1 style={styles.titol}>Quadern de Camp</h1>
        <p style={styles.subtitol}>
          {pobleSeleccionat && campSeleccionat
            ? `${pobleSeleccionat.nom} · ${campSeleccionat.nom}`
            : pobleSeleccionat
            ? pobleSeleccionat.nom
            : 'Selecciona un poble'}
        </p>
      </div>

      <div style={styles.contingut}>
        <div style={styles.columna}>
          <h2 style={styles.seccio}>Pobles</h2>
          {pobles.map(p => (
            <div
              key={p.id}
              style={{
                ...styles.item,
                ...(pobleSeleccionat?.id === p.id ? styles.itemActiu : {})
              }}
              onClick={() => seleccionaPoble(p)}
            >
              {p.nom}
            </div>
          ))}
        </div>

        {pobleSeleccionat && (
          <div style={styles.columna}>
            <h2 style={styles.seccio}>Camps</h2>
            {camps.map(c => (
              <div
                key={c.id}
                style={{
                  ...styles.item,
                  ...(campSeleccionat?.id === c.id ? styles.itemActiu : {})
                }}
                onClick={() => seleccionaCamp(c)}
              >
                {c.nom}
              </div>
            ))}
          </div>
        )}

        {campSeleccionat && (
          <div style={styles.columna}>
            <h2 style={styles.seccio}>
              Zones — {zones.length} en total
            </h2>
            <div style={styles.graella}>
              {zones.filter(z => z.es_permanent).map(z => (
                <div key={z.id} style={{
                  ...styles.zonaPermanent,
                  background: z.color || '#e0e0e0'
                }}>
                  {z.nom || z.codi}
                </div>
              ))}
            </div>
            <div style={styles.graella}>
              {zones.filter(z => !z.es_permanent).map(z => (
                <div key={z.id} style={styles.zona}>
                  {z.codi}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  app: {
    fontFamily: 'system-ui, sans-serif',
    minHeight: '100vh',
    background: '#f8f7f4',
  },
  capçalera: {
    background: '#1D9E75',
    padding: '16px 24px',
    color: 'white',
  },
  titol: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
  },
  subtitol: {
    fontSize: '13px',
    margin: '4px 0 0',
    opacity: 0.85,
  },
  contingut: {
    display: 'flex',
    gap: '0',
    height: 'calc(100vh - 72px)',
  },
  columna: {
    width: '220px',
    borderRight: '1px solid #e0ddd8',
    padding: '16px',
    overflowY: 'auto',
    background: 'white',
  },
  seccio: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  item: {
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
    marginBottom: '4px',
  },
  itemActiu: {
    background: '#E1F5EE',
    color: '#0F6E56',
    fontWeight: '500',
  },
  graella: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '16px',
  },
  zona: {
    width: '44px',
    height: '44px',
    background: '#f0ede8',
    border: '1px solid #ddd',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '500',
    color: '#555',
    cursor: 'pointer',
  },
  zonaPermanent: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white',
    cursor: 'pointer',
  },
  centrat: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  carregant: {
    color: '#888',
    fontSize: '16px',
  },
}
