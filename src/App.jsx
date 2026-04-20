import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import MapaCamp from './MapaCamp.jsx'
import FormulariTasca from './FormulariTasca.jsx'
import Historial from './Historial.jsx'
import EditorCamp from './EditorCamp.jsx'
import Login from './Login.jsx'
import AppMovil from './AppMovil.jsx'
import Configuracio from './Configuracio.jsx'
import GestioCamps from './GestioCamps.jsx'
import GestioUsuaris from './GestioUsuaris.jsx'

export default function App() {
  const [usuari, setUsuari] = useState(null)
  const [pobles, setPobles] = useState([])
  const [camps, setCamps] = useState([])
  const [zones, setZones] = useState([])
  const [pobleSeleccionat, setPobleSeleccionat] = useState(null)
  const [campSeleccionat, setCampSeleccionat] = useState(null)
  const [zonesSeleccionades, setZonesSeleccionades] = useState([])
  const [mostrarFormulari, setMostrarFormulari] = useState(false)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [mostrarEditor, setMostrarEditor] = useState(false)
  const [carregant, setCarregant] = useState(true)
  const [cultiusActius, setCultiusActius] = useState({})
  const [dataConsulta, setDataConsulta] = useState('')
  const [mostrarConfig, setMostrarConfig] = useState(false)
  const [mostrarGestioCamps, setMostrarGestioCamps] = useState(false)
  const [mostrarGestioUsuaris, setMostrarGestioUsuaris] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('sessió trobada:', session?.user?.email)
      setUsuari(session?.user ?? null)
      setCarregant(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuari(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    console.log('useEffect usuari:', usuari?.email)
    if (usuari) {
      carregaPobles()
      comprovaAdmin()
    }
  }, [usuari])

  async function comprovaAdmin() {
    const { data, error } = await supabase
      .from('usuaris_autoritzats')
      .select('es_admin')
      .eq('email', usuari.email)
      .single()
    console.log('comprovaAdmin:', data, error, usuari.email)
    setEsAdmin(data?.es_admin || false)
  }

  async function carregaPobles() {
    const { data: poblesData } = await supabase.from('pobles').select('*').order('nom')
    setPobles(poblesData || [])
    const { data: campsData } = await supabase.from('camps').select('*').order('nom')
    setCamps(campsData || [])
  }

  async function seleccionaPoble(poble) {
    setPobleSeleccionat(poble)
    setCampSeleccionat(null)
    setZones([])
    setZonesSeleccionades([])
    const { data } = await supabase
      .from('camps').select('*').eq('poble_id', poble.id).order('nom')
    setCamps(data || [])
  }

  async function seleccionaCamp(camp) {
    setZonesSeleccionades([])
    const { data: campData } = await supabase
      .from('camps').select('*').eq('id', camp.id).single()
    setCampSeleccionat(campData || camp)
    const { data } = await supabase
      .from('zones').select('*').eq('camp_id', camp.id).order('codi')
    setZones(data || [])
    carregaCultiusActius(data || [], dataConsulta || null)
  }

  async function carregaCultiusActius(zones, dataFiltrar = null) {
    const zonaIds = zones.map(z => z.id)
    if (!zonaIds.length) return
    let query = supabase
      .from('registres')
      .select('zona_id, data, cultius(nom, color), varietats(nom), tasques(nom)')
      .in('zona_id', zonaIds)
      .order('data', { ascending: false })
    if (dataFiltrar) query = query.lte('data', dataFiltrar)
    const { data } = await query
    const cultiusPerZona = {}
    const tasquesPlantacio = ['Plantar', 'Sembrar', 'Zona permanent']
    zones.forEach(zona => {
      const regsZona = (data || []).filter(r => r.zona_id === zona.id)
      const plantacions = regsZona.filter(r => tasquesPlantacio.includes(r.tasques?.nom))
      const neteges = regsZona.filter(r => r.tasques?.nom === 'Netejar')
      if (!plantacions.length) return
      const ultima = plantacions[0]
      const ultimaNetejar = neteges[0]
      if (ultimaNetejar && new Date(ultimaNetejar.data) > new Date(ultima.data)) return
      cultiusPerZona[zona.id] = {
        nom: ultima.cultius?.nom,
        color: ultima.cultius?.color,
        varietat: ultima.varietats?.nom,
      }
    })
    setCultiusActius(cultiusPerZona)
  }

  function toggleZona(zona) {
    setZonesSeleccionades(prev => {
      const jaSeleccionada = prev.find(z => z.id === zona.id)
      if (jaSeleccionada) return prev.filter(z => z.id !== zona.id)
      return [...prev, zona]
    })
  }

  function seleccionaFila(fila) {
    const zonesFila = zones.filter(z => z.fila === fila && !z.es_permanent)
    setZonesSeleccionades(prev => {
      const jaHiSon = zonesFila.every(z => prev.find(p => p.id === z.id))
      if (jaHiSon) return prev.filter(z => z.fila !== fila)
      const sense = prev.filter(z => z.fila !== fila)
      return [...sense, ...zonesFila]
    })
  }

  function seleccionaTot() {
    const zonesCultiu = zones.filter(z => !z.es_permanent)
    const totes = zonesCultiu.every(z => zonesSeleccionades.find(s => s.id === z.id))
    if (totes) setZonesSeleccionades([])
    else setZonesSeleccionades(zonesCultiu)
  }

  function resumSeleccio() {
    if (zonesSeleccionades.length === 0) return null
    const codis = zonesSeleccionades.map(z => z.codi).sort()
    if (codis.length > 6) return `${codis.length} zones seleccionades`
    return `Zones: ${codis.join(', ')}`
  }

  function campAmbPoble() {
    return { ...campSeleccionat, poble: pobleSeleccionat }
  }

  async function tancarSessio() {
    await supabase.auth.signOut()
    setPobleSeleccionat(null)
    setCampSeleccionat(null)
    setZones([])
    setZonesSeleccionades([])
  }

  if (carregant) return (
    <div style={styles.centrat}><p style={{color:'#888'}}>Carregant...</p></div>
  )

  if (!usuari) return <Login onLogin={setUsuari} />
  const esMobil = window.innerWidth < 768
  
  if (esMobil) return (
    <AppMovil
      usuari={usuari}
      pobles={pobles}
      camps={camps}
      zones={zones}
      cultiusActius={cultiusActius}
      dataConsulta={dataConsulta}
      pobleSeleccionat={pobleSeleccionat}
      campSeleccionat={campSeleccionat}
      zonesSeleccionades={zonesSeleccionades}
      onSeleccionaPoble={setPobleSeleccionat}
      onSeleccionaCamp={seleccionaCamp}
      onToggleZona={toggleZona}
      onSeleccionaFila={seleccionaFila}
      onCanviaData={(d) => {
        setDataConsulta(d)
        carregaCultiusActius(zones, d || null)
      }}
      onGuardatTasca={() => {
        setZonesSeleccionades([])
        carregaCultiusActius(zones, dataConsulta || null)
      }}
      onTancarSessio={tancarSessio}
    />
  )
  return (
    <div style={styles.app}>
      <div style={styles.capcalera}>
        <h1 style={styles.titol}>Quadern de Camp</h1>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <p style={styles.subtitol}>
            {pobleSeleccionat && campSeleccionat
              ? `${pobleSeleccionat.nom} · ${campSeleccionat.nom}`
              : pobleSeleccionat ? pobleSeleccionat.nom
              : ''}
          </p>
          {esAdmin && (
              <button onClick={() => setMostrarGestioUsuaris(true)} style={styles.botoCapcalera}>
                👥 Usuaris
              </button>
            )}
          <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
            <button onClick={() => setMostrarGestioCamps(true)} style={styles.botoCapcalera}>
              🗺️ Camps
            </button>
            <button onClick={() => setMostrarConfig(true)} style={styles.botoCapcalera}>
              ⚙️ Config
            </button>
            <span style={{fontSize:'12px', opacity:0.8}}>{usuari.email}</span>
            <button onClick={tancarSessio} style={styles.botoSortir}>Sortir</button>
          </div>
        </div>
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
            {camps.filter(c => c.poble_id === pobleSeleccionat?.id).map(c => (
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
              zonesSeleccionades={zonesSeleccionades}
              onToggleZona={toggleZona}
              onSeleccionaFila={seleccionaFila}
              cultiusActius={cultiusActius}
              dataConsulta={dataConsulta}
              onCanviaData={(d) => {
                setDataConsulta(d)
                carregaCultiusActius(zones, d || null)
              }}
            />
          ) : (
            <div style={styles.centrat}>
              <p style={{color:'#aaa', fontSize:'15px'}}>
                {pobleSeleccionat ? 'Selecciona un camp' : 'Selecciona un poble i un camp'}
              </p>
            </div>
          )}
        </div>

        {campSeleccionat && (
          <div style={styles.panell}>
            {zonesSeleccionades.length > 0 ? <>
              <div style={styles.panellTitol}>Selecció</div>
              <div style={styles.resumSeleccio}>{resumSeleccio()}</div>
              <button style={styles.boto} onClick={() => setMostrarFormulari(true)}>
                + Nova tasca
              </button>
              <button style={{...styles.boto, ...styles.botoSecundari}}
                onClick={() => setMostrarHistorial(true)}>
                Veure historial
              </button>
              <button style={{...styles.boto, ...styles.botoSecundari}}
                onClick={() => setZonesSeleccionades([])}>
                Netejar selecció
              </button>
              <div style={{...styles.seccio, marginTop:'16px'}}>Accions ràpides</div>
              <button style={{...styles.boto, ...styles.botoSecundari}}
                onClick={() => {
                  if (zonesSeleccionades.length > 0 && zonesSeleccionades[0].fila) {
                    seleccionaFila(zonesSeleccionades[0].fila)
                  }
                }}>
                Selecciona fila sencera
              </button>
              <button style={{...styles.boto, ...styles.botoSecundari}}
                onClick={seleccionaTot}>
                Selecciona tot el camp
              </button>
            </> : <>
              <div style={styles.panellTitol}>Camp</div>
              <div style={styles.panellInfo}>{campSeleccionat.nom}</div>
              <div style={{fontSize:'12px', color:'#aaa', marginTop:'8px'}}>
                Toca les zones del mapa per seleccionar-les
              </div>
              <button style={{...styles.boto, ...styles.botoSecundari, marginTop:'16px'}}
                onClick={seleccionaTot}>
                Selecciona tot el camp
              </button>
              <button style={{...styles.boto, ...styles.botoSecundari}}
                onClick={() => setMostrarEditor(true)}>
                ✏️ Editar zones
              </button>
              
            </>}
          </div>
        )}
      </div>

      {mostrarEditor && (
        <EditorCamp
          camp={campSeleccionat}
          onTancar={() => setMostrarEditor(false)}
          onGuardat={() => {
            setMostrarEditor(false)
            seleccionaCamp(campSeleccionat)
          }}
        />
      )}
      {mostrarHistorial && zonesSeleccionades.length > 0 && (
        <Historial
          zones={zonesSeleccionades}
          onTancar={() => setMostrarHistorial(false)}
        />
      )}
      {mostrarConfig && (
        <Configuracio onTancar={() => setMostrarConfig(false)} />
      )}
      {mostrarGestioCamps && (
        <GestioCamps
          onTancar={() => setMostrarGestioCamps(false)}
          onActualitzar={() => carregaPobles()}
        />
      )}
      {mostrarGestioUsuaris && (
        <GestioUsuaris onTancar={() => setMostrarGestioUsuaris(false)} />
      )}
      {mostrarFormulari && (
        <FormulariTasca
          zones={zonesSeleccionades}
          camp={campAmbPoble()}
          onTancar={() => setMostrarFormulari(false)}
          onGuardat={() => {
            setMostrarFormulari(false)
            setZonesSeleccionades([])
            carregaCultiusActius(zones, dataConsulta || null)
          }}
        />
      )}
    </div>
  )
}

const styles = {
  app: { fontFamily:'system-ui,sans-serif', minHeight:'100vh', background:'#f8f7f4' },
  capcalera: { background:'#1D9E75', padding:'10px 24px', color:'white' },
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
  resumSeleccio: { fontSize:'13px', color:'#555', background:'#f0f0f0', borderRadius:'6px', padding:'8px 10px', marginBottom:'12px' },
  panellInfo: { fontSize:'14px', color:'#555', marginBottom:'6px' },
  boto: { width:'100%', padding:'10px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', cursor:'pointer', marginBottom:'8px' },
  botoSecundari: { background:'white', color:'#1D9E75', border:'1px solid #1D9E75' },
  botoSortir: { padding:'5px 12px', background:'rgba(255,255,255,0.2)', color:'white', border:'1px solid rgba(255,255,255,0.4)', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
  centrat: { display:'flex', alignItems:'center', justifyContent:'center', height:'100%' },
  botoCapcalera: { padding:'5px 10px', background:'rgba(255,255,255,0.2)', color:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
}
