import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import MapaCamp from './MapaCamp.jsx'

export default function App() {
  const [pobles, setPobles] = useState([])
  const [camps, setCamps] = useState([])
  const [zones, setZones] = useState([])
  const [pobleSeleccionat, setPobleSeleccionat] = useState(null)
  const [campSeleccionat, setCampSeleccionat] = useState(null)
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [carregant, setCarregant] = useState(true)

  useEffect(() => { carregaPobles() }, [])

  async function carregaPobles() {
    const { data } = await supabase.from('pobles').select('*').order('nom')
    setPobles(data || [])
    setCarregant(false)
  }

  async function seleccionaPoble(poble) {
    setPobleSeleccionat(poble)
    setCampSeleccionat(null)
    setZones([])
    setZonaSeleccionada(null)
    const { data } = await supabase
      .from('camps').select('*').eq('poble_id', poble.id).order('nom')
    setCamps(data || [])
  }

  async function seleccionaCamp(camp) {
    setCampSeleccionat(camp)
    setZonaSeleccionada(null)
    const { data } = await supabase
      .from('zones').select('*').eq('camp_id', camp.id).order('codi')
    setZones(data || [])
  }

  if (carregant) return (
    <div style={styles.centrat}><p style={{color:'#888'}}>Carregant...</p></div>
  )

  return (
    <div style={styles.app}>
      <div style={styles.capcalera}>
        <h1 style={styles.titol}>Quadern de Camp</h1>
        <p style={styles.subtitol}>
          {pobleSeleccionat && campSeleccionat
            ? `${pobleSeleccionat.nom} · ${campSeleccionat.nom}`
            : pobleSeleccionat ? pobleSeleccionat.nom
            : 'Selecciona un poble'}
        </p>
      </div>

      <div style={styles.contingut}>
        <div style={styles.sidebar}>
          <div style={styles.seccio}>Pobles</div>
          {pobles.map(p => (
            <div key={p.id}
              style={{...styles.item, ...(pobleSeleccionat?.id===p.id ? styles.itemActiu : {})}}
              onClick={() => seleccionaPoble(p)}>
              {p.nom}
            </div>
          ))}

          {pobleSeleccionat && <>
            <div style={{...styles.seccio, marginTop:'16px'}}>Camps</div>
            {camps.map(c => (
              <div key={c.id}
                style={{...styles.item, ...(campSeleccionat?.id===c.id ? styles.itemActiu : {})}}
                onClick={() => seleccionaCamp(c)}>
                {c.nom}
              </div>
            ))}
          </>}
        </div>

        <div style={styles.principal}>
          {campSeleccionat && zones.length > 0 ? (
            <MapaCamp
              camp={campSeleccionat}
              zones={zones}
              zonaSeleccionada={zonaSeleccionada}
              onSeleccionaZona={setZonaSeleccionada}
            />
          ) : (
            <div style={styles.centrat}>
              <p style={{color:'#aaa', fontSize:'15px'}}>
                {pobleSeleccionat ? 'Selecciona un camp' : 'Selecciona un poble i un camp'}
              </p>
            </div>
          )}
        </div>

        {zonaSeleccionada && (
          <div style={styles.panell}>
            <div style={styles.panellTitol}>
              Zona {zonaSeleccionada.codi}
              {zonaSeleccionada.nom && ` · ${zonaSeleccionada.nom}`}
            </div>
            <div style={styles.panellBadge}>
              {zonaSeleccionada.es_permanent ? 'Zona permanent' : 'Zona de cultiu'}
            </div>
            {zonaSeleccionada.tub_reg && (
              <div style={styles.panellInfo}>Tub de reg: {zonaSeleccionada.tub_reg}</div>
            )}
            {zonaSeleccionada.fila && (
              <div style={styles.panellInfo}>Fila: {zonaSeleccionada.fila}</div>
            )}
            <button style={styles.boto} onClick={() => alert('Formulari de tasca — proper pas!')}>
              + Nova tasca
            </button>
            <button style={{...styles.boto, ...styles.botoSecundari}}
              onClick={() => alert('Historial — proper pas!')}>
              Veure historial
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  app: { fontFamily:'system-ui,sans-serif', minHeight:'100vh', background:'#f8f7f4' },
  capcalera: { background:'#1D9E75', padding:'14px 24px', color:'white' },
  titol: { fontSize:'18px', fontWeight:'600', margin:0 },
  subtitol: { fontSize:'12px', margin:'3px 0 0', opacity:0.85 },
  contingut: { display:'flex', height:'calc(100vh - 60px)' },
  sidebar: { width:'200px', borderRight:'1px solid #e0ddd8', padding:'12px', overflowY:'auto', background:'white' },
  principal: { flex:1, overflow:'hidden', position:'relative' },
  panell: { width:'220px', borderLeft:'1px solid #e0ddd8', padding:'16px', background:'white', overflowY:'auto' },
  seccio: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' },
  item: { padding:'8px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'14px', color:'#333', marginBottom:'3px' },
  itemActiu: { background:'#E1F5EE', color:'#0F6E56', fontWeight:'500' },
  panellTitol: { fontSize:'16px', fontWeight:'600', color:'#333', marginBottom:'8px' },
  panellBadge: { display:'inline-block', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', background:'#E1F5EE', color:'#0F6E56', marginBottom:'12px' },
  panellInfo: { fontSize:'13px', color:'#666', marginBottom:'6px' },
  boto: { width:'100%', padding:'10px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', cursor:'pointer', marginBottom:'8px' },
  botoSecundari: { background:'white', color:'#1D9E75', border:'1px solid #1D9E75' },
  centrat: { display:'flex', alignItems:'center', justifyContent:'center', height:'100%' },
}
