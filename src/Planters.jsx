import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Planters({ onTancar }) {
  const [planters, setPlanters] = useState([])
  const [planterActiu, setPlanterActiu] = useState(null)
  const [cellesActives, setCellesActives] = useState([])
  const [cultius, setCultius] = useState([])
  const [varietats, setVarietats] = useState([])
  const [vistaActiva, setVistaActiva] = useState('llista')
  const [cellaSeleccionada, setCellaSeleccionada] = useState(null)
  const [mostrarNouPlanter, setMostrarNouPlanter] = useState(false)
  const [guardant, setGuardant] = useState(false)
  

  // Nou planter
  const [nouNom, setNouNom] = useState('')
  const [nouFiles, setNouFiles] = useState(4)
  const [nouColumnes, setNouColumnes] = useState(6)
  const [nouUbicacio, setNouUbicacio] = useState('Casa')
  

  // Edició cel·la
  const [cellaEstat, setCellaEstat] = useState('buida')
  const [cellaCultiuId, setCellaCultiuId] = useState('')
  const [cellaVarietatId, setCellaVarietatId] = useState('')
  const [cellaData, setCellaData] = useState(new Date().toISOString().split('T')[0])
  const [cellaNotes, setCellaNotes] = useState('')
  const [cellesSeleccionades, setCellesSeleccionades] = useState([])

  useEffect(() => { carregaDades() }, [])
  useEffect(() => { if (planterActiu) carregaCelles(planterActiu.id) }, [planterActiu])
  useEffect(() => { if (cellaCultiuId) carregaVarietats(cellaCultiuId) }, [cellaCultiuId])

  async function carregaDades() {
    const [p, c] = await Promise.all([
      supabase.from('planters').select('*').order('created_at', { ascending: false }),
      supabase.from('cultius').select('*').order('nom'),
    ])
    setPlanters(p.data || [])
    setCultius(c.data || [])
  }

  async function carregaCelles(planterId) {
    const { data } = await supabase
      .from('planter_cel·les')
      .select('*, cultius(nom, color), varietats(nom)')
      .eq('planter_id', planterId)
      .order('fila').order('columna')
    setCellesActives(data || [])
  }

  async function carregaVarietats(cultiuId) {
    const { data } = await supabase.from('varietats').select('*').eq('cultiu_id', cultiuId).order('nom')
    setVarietats(data || [])
    setCellaVarietatId('')
  }

  async function crearPlanter() {
    setGuardant(true)
    const { data: planter } = await supabase.from('planters').insert({
      nom: nouNom || `Planter ${new Date().toLocaleDateString('ca-ES')}`,
      files: nouFiles,
      columnes: nouColumnes,
      ubicacio: nouUbicacio,
    }).select().single()

    if (planter) {
      // Crear totes les cel·les buides
      const celles = []
      for (let f=1; f<=nouFiles; f++) {
        for (let c=1; c<=nouColumnes; c++) {
          celles.push({ planter_id: planter.id, fila: f, columna: c, estat: 'buida' })
        }
      }
      await supabase.from('planter_cel·les').insert(celles)
      await carregaDades()
      setPlanterActiu(planter)
      setVistaActiva('editar')
      setMostrarNouPlanter(false)
    }
    setGuardant(false)
  }

  async function marcarGastat(planter) {
    await supabase.from('planters').update({
      estat: 'gastat',
      data_fi: new Date().toISOString().split('T')[0]
    }).eq('id', planter.id)
    await carregaDades()
    if (planterActiu?.id === planter.id) setPlanterActiu({...planter, estat:'gastat'})
  }

  async function guardarCella() {
    const aGuardar = cellesSeleccionades.length > 0 ? cellesSeleccionades : [cellaSeleccionada]
    if (!aGuardar.length) return
    setGuardant(true)
    for (const cella of aGuardar) {
      await supabase.from('planter_cel·les').update({
        estat: cellaEstat,
        cultiu_id: cellaEstat === 'sembrada' ? (cellaCultiuId ? parseInt(cellaCultiuId) : null) : null,
        varietat_id: cellaEstat === 'sembrada' ? (cellaVarietatId ? parseInt(cellaVarietatId) : null) : null,
        data_sembra: cellaEstat === 'sembrada' ? cellaData : null,
        notes: cellaNotes || null,
      }).eq('id', cella.id)
    }
    await carregaCelles(planterActiu.id)
    setCellaSeleccionada(null)
    setCellesSeleccionades([])
    setGuardant(false)
  }

  function toggleCella(cella) {
    setCellesSeleccionades(prev => {
      const jaHi = prev.find(c => c.id === cella.id)
      if (jaHi) return prev.filter(c => c.id !== cella.id)
      return [...prev, cella]
    })
    // Si és la primera seleccionada, carregar els seus valors al panell
    setCellaSeleccionada(cella)
    setCellaEstat(cella.estat)
    setCellaCultiuId(cella.cultiu_id?.toString() || '')
    setCellaVarietatId(cella.varietat_id?.toString() || '')
    setCellaData(cella.data_sembra || new Date().toISOString().split('T')[0])
    setCellaNotes(cella.notes || '')
  }

  function colorCella(cella) {
    if (cella.estat === 'x') return '#e0e0e0'
    if (cella.estat === 'sembrada') return cella.cultius?.color || '#C0DD97'
    return 'white'
  }

  function textCella(cella) {
    if (cella.estat === 'x') return '✕'
    if (cella.estat === 'sembrada') {
      const nom = cella.cultius?.nom || ''
      const var_ = cella.varietats?.nom && cella.varietats.nom !== '-' ? cella.varietats.nom : ''
      return var_ ? `${nom}\n${var_}` : nom
    }
    return ''
  }

  const plantersActius = planters.filter(p => p.estat === 'actiu')
  const plantersGastats = planters.filter(p => p.estat === 'gastat')

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={styles.titol}>🌱 Planters</div>
          <div style={{display:'flex', gap:'8px'}}>
            <button style={styles.botoNou} onClick={() => setMostrarNouPlanter(true)}>+ Nou planter</button>
            <button style={styles.botoTancar} onClick={onTancar}>✕</button>
          </div>
        </div>

        <div style={styles.cos}>
          {/* Llista de planters */}
          <div style={styles.sidebar}>
            {plantersActius.length > 0 && (
              <>
                <div style={styles.seccio}>Actius ({plantersActius.length})</div>
                {plantersActius.map(p => (
                  <div key={p.id}
                    style={{...styles.planterItem, ...(planterActiu?.id===p.id?styles.planterActiu:{})}}
                    onClick={() => { setPlanterActiu(p); setVistaActiva('editar'); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
                    <div style={styles.planterNom}>{p.nom}</div>
                    <div style={styles.planterInfo}>{p.files}×{p.columnes} · {p.ubicacio}</div>
                    <div style={styles.planterData}>{new Date(p.data_inici).toLocaleDateString('ca-ES')}</div>
                  </div>
                ))}
              </>
            )}
            {plantersGastats.length > 0 && (
              <>
                <div style={{...styles.seccio, marginTop:'16px'}}>Gastats ({plantersGastats.length})</div>
                {plantersGastats.map(p => (
                  <div key={p.id}
                    style={{...styles.planterItem, opacity:0.6, ...(planterActiu?.id===p.id?styles.planterActiu:{})}}
                    onClick={() => { setPlanterActiu(p); setVistaActiva('editar'); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
                    <div style={styles.planterNom}>{p.nom}</div>
                    <div style={styles.planterInfo}>{p.files}×{p.columnes} · {p.ubicacio}</div>
                  </div>
                ))}
              </>
            )}
            {planters.length === 0 && (
              <div style={{color:'#aaa', fontSize:'13px', padding:'12px'}}>
                No hi ha planters. Crea'n un amb "+ Nou planter".
              </div>
            )}
          </div>

          {/* Graella del planter */}
          <div style={styles.principal}>
            {planterActiu ? (
              <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
                <div style={styles.planterHeader}>
                  <div>
                    <div style={styles.planterTitol}>{planterActiu.nom}</div>
                    <div style={styles.planterSubtitol}>
                      {planterActiu.files}×{planterActiu.columnes} cel·les · {planterActiu.ubicacio}
                      {planterActiu.estat === 'gastat' && <span style={styles.badgeGastat}>Gastat</span>}
                    </div>
                  </div>
                  {planterActiu.estat === 'actiu' && (
                    <button style={styles.botoGastat}
                      onClick={() => { if(window.confirm('Marcar com a gastat?')) marcarGastat(planterActiu) }}>
                      ✓ Marcar com gastat
                    </button>
                  )}
                </div>

                <div style={styles.graellaWrap}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${planterActiu.columnes}, minmax(28px, 40px))`,
                    gap: '2px',
                    padding: '12px',
                  }}>
                    {Array.from({length: planterActiu.files}, (_,fi) =>
                    Array.from({length: planterActiu.columnes}, (_,ci) => {
                      const cella = cellesActives.find(c => c.fila===fi+1 && c.columna===ci+1)
                      const seleccionada = cellesSeleccionades.some(c => c.id === cella?.id)
                      const estaX = cella?.estat === 'x'
                      const estaSembrada = cella?.estat === 'sembrada'
                      return (
                        <div key={`${fi}-${ci}`}
                          onClick={() => cella && toggleCella(cella)}
                          style={{
                            aspectRatio: '1',
                            background: estaX ? '#ccc' : estaSembrada ? (cella.cultius?.color || '#C0DD97') : 'white',
                            border: seleccionada ? '2px solid #1D9E75' : '1px solid #ddd',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                          }}>
                          {estaX ? (
                            <span style={{fontSize:'16px', fontWeight:'bold', color:'#888', lineHeight:1}}>✕</span>
                          ) : estaSembrada ? (
                            <>
                              <span style={{fontSize:'8px', fontWeight:'600', color:'#333', textAlign:'center', lineHeight:1.2, padding:'1px'}}>
                                {cella.cultius?.nom?.substring(0,8)}
                              </span>
                              {cella.varietats?.nom && cella.varietats.nom !== '-' && (
                                <span style={{fontSize:'7px', color:'#555', textAlign:'center', lineHeight:1.1}}>
                                  {cella.varietats.nom.substring(0,8)}
                                </span>
                              )}
                            </>
                          ) : null}
                          {seleccionada && (
                            <div style={{position:'absolute', top:'1px', right:'2px', fontSize:'8px', color:'#1D9E75'}}>✓</div>
                          )}
                        </div>
                      )
                    })
                  )}
                  </div>
                </div>

                {/* Llegenda */}
                <div style={styles.llegenda}>
                  <div style={styles.llegendaItem}><div style={{...styles.llegendaDot, background:'white', border:'1px solid #ddd'}}/> Buida</div>
                  <div style={styles.llegendaItem}><div style={{...styles.llegendaDot, background:'#e0e0e0'}}/> No usada (X)</div>
                  <div style={styles.llegendaItem}><div style={{...styles.llegendaDot, background:'#C0DD97'}}/> Sembrada</div>
                </div>
              </div>
            ) : (
              <div style={styles.centrat}>
                <div style={{textAlign:'center', color:'#aaa'}}>
                  <div style={{fontSize:'48px', marginBottom:'12px'}}>🌱</div>
                  <div>Selecciona un planter o crea'n un de nou</div>
                </div>
              </div>
            )}
          </div>

          {/* Panell edició cel·la */}
          {(cellaSeleccionada || cellesSeleccionades.length > 0) && (
            <div style={styles.panell}>
              <div style={styles.panellTitol}>
                {cellesSeleccionades.length > 1
                  ? `${cellesSeleccionades.length} cel·les seleccionades`
                  : `Cel·la ${cellaSeleccionada.fila},${cellaSeleccionada.columna}`}
              </div>
              {cellesSeleccionades.length > 1 && (
                <div style={{fontSize:'11px', color:'#888', marginBottom:'10px'}}>
                  Els canvis s'aplicaran a totes les cel·les seleccionades
                </div>
              )}

              <div style={styles.grup}>
                <label style={styles.label}>Estat</label>
                <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                  {[
                    {val:'buida', label:'Buida', icon:'○'},
                    {val:'x', label:'No usada', icon:'✕'},
                    {val:'sembrada', label:'Sembrada', icon:'🌱'},
                  ].map(o => (
                    <div key={o.val}
                      style={{...styles.opcio, ...(cellaEstat===o.val?styles.opcioActiva:{})}}
                      onClick={() => setCellaEstat(o.val)}>
                      {o.icon} {o.label}
                    </div>
                  ))}
                </div>
              </div>

              {cellaEstat === 'sembrada' && (
                <>
                  <div style={styles.grup}>
                    <label style={styles.label}>Data sembra</label>
                    <input type="date" style={styles.input} value={cellaData}
                      onChange={e => setCellaData(e.target.value)}/>
                  </div>
                  <div style={styles.grup}>
                    <label style={styles.label}>Cultiu</label>
                    <select style={styles.input} value={cellaCultiuId}
                      onChange={e => setCellaCultiuId(e.target.value)}>
                      <option value="">— cap —</option>
                      {cultius.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </div>
                  {varietats.length > 0 && (
                    <div style={styles.grup}>
                      <label style={styles.label}>Varietat</label>
                      <select style={styles.input} value={cellaVarietatId}
                        onChange={e => setCellaVarietatId(e.target.value)}>
                        <option value="">— cap —</option>
                        {varietats.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div style={styles.grup}>
                <label style={styles.label}>Notes</label>
                <textarea style={{...styles.input, height:'60px', resize:'vertical'}}
                  value={cellaNotes} onChange={e => setCellaNotes(e.target.value)}/>
              </div>

              <div style={{display:'flex', gap:'8px'}}>
                <button style={styles.botoPrimari} onClick={guardarCella} disabled={guardant}>
                  {guardant ? '...' : 'Guardar'}
                </button>
                <button style={styles.botoCancel} onClick={() => setCellaSeleccionada(null)}>
                  Cancel·lar
                </button>
                <button style={styles.botoCancel} onClick={() => { setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
                  Cancel·lar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal nou planter */}
        {mostrarNouPlanter && (
          <div style={styles.modalNou}>
            <div style={styles.modalNouCos}>
              <div style={styles.modalNouTitol}>Nou planter</div>
              <div style={styles.grup}>
                <label style={styles.label}>Nom (opcional)</label>
                <input style={styles.input} value={nouNom}
                  onChange={e => setNouNom(e.target.value)}
                  placeholder={`Planter ${new Date().toLocaleDateString('ca-ES')}`}/>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div style={styles.grup}>
                  <label style={styles.label}>Files</label>
                  <input type="number" style={styles.input} value={nouFiles} min="1" max="20"
                    onChange={e => setNouFiles(parseInt(e.target.value)||1)}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Columnes</label>
                  <input type="number" style={styles.input} value={nouColumnes} min="1" max="30"
                    onChange={e => setNouColumnes(parseInt(e.target.value)||1)}/>
                </div>
              </div>
              <div style={styles.grup}>
                <label style={styles.label}>Ubicació</label>
                <input style={styles.input} value={nouUbicacio}
                  onChange={e => setNouUbicacio(e.target.value)}/>
              </div>
              <div style={{background:'#f0f9f5', border:'1px solid #b5e0d0', borderRadius:'8px', padding:'10px', fontSize:'12px', color:'#555', marginBottom:'12px'}}>
                Es crearà una graella de {nouFiles}×{nouColumnes} = {nouFiles*nouColumnes} cel·les
              </div>
              <div style={{display:'flex', gap:'8px'}}>
                <button style={styles.botoPrimari} onClick={crearPlanter} disabled={guardant}>
                  {guardant ? 'Creant...' : 'Crear planter'}
                </button>
                <button style={styles.botoCancel} onClick={() => setMostrarNouPlanter(false)}>
                  Cancel·lar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(1000px, 97vw)', height:'90vh', display:'flex', flexDirection:'column' },
  cap: { padding:'14px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  titol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999' },
  botoNou: { padding:'7px 14px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'500' },
  cos: { flex:1, display:'flex', overflow:'hidden' },
  sidebar: { width:'220px', borderRight:'1px solid #eee', padding:'12px', overflowY:'auto', flexShrink:0 },
  seccio: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' },
  planterItem: { padding:'10px', borderRadius:'8px', cursor:'pointer', marginBottom:'4px', border:'1px solid #eee' },
  planterActiu: { background:'#E1F5EE', borderColor:'#1D9E75' },
  planterNom: { fontSize:'13px', fontWeight:'600', color:'#333' },
  planterInfo: { fontSize:'11px', color:'#888', marginTop:'2px' },
  planterData: { fontSize:'11px', color:'#aaa', marginTop:'2px' },
  principal: { flex:1, overflow:'hidden', display:'flex', flexDirection:'column' },
  planterHeader: { padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  planterTitol: { fontSize:'15px', fontWeight:'600', color:'#333' },
  planterSubtitol: { fontSize:'12px', color:'#888', marginTop:'2px', display:'flex', alignItems:'center', gap:'8px' },
  badgeGastat: { background:'#f0f0f0', color:'#888', padding:'2px 8px', borderRadius:'20px', fontSize:'11px' },
  botoGastat: { padding:'7px 14px', background:'white', color:'#1D9E75', border:'1px solid #1D9E75', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
  graellaWrap: { flex:1, overflow:'auto' },
  llegenda: { display:'flex', gap:'16px', padding:'8px 16px', borderTop:'1px solid #eee', flexShrink:0 },
  llegendaItem: { display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#666' },
  llegendaDot: { width:'14px', height:'14px', borderRadius:'3px' },
  panell: { width:'220px', borderLeft:'1px solid #eee', padding:'14px', overflowY:'auto', flexShrink:0 },
  panellTitol: { fontSize:'14px', fontWeight:'600', color:'#333', marginBottom:'12px' },
  centrat: { display:'flex', alignItems:'center', justifyContent:'center', height:'100%' },
  grup: { marginBottom:'10px' },
  label: { display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' },
  input: { width:'100%', padding:'7px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' },
  opcio: { padding:'7px 10px', border:'1px solid #ddd', borderRadius:'6px', cursor:'pointer', fontSize:'13px', color:'#333' },
  opcioActiva: { background:'#E1F5EE', borderColor:'#1D9E75', color:'#0F6E56', fontWeight:'500' },
  botoPrimari: { flex:1, padding:'8px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'500' },
  botoCancel: { padding:'8px 14px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
  modalNou: { position:'absolute', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'12px' },
  modalNouCos: { background:'white', borderRadius:'10px', padding:'24px', width:'340px' },
  modalNouTitol: { fontSize:'16px', fontWeight:'600', color:'#333', marginBottom:'16px' },
}
