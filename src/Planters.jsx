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
  const esMobil = window.innerWidth < 768
  const [vistaMovil, setVistaMovil] = useState('llista')
  const [mostrarPanellMovil, setMostrarPanellMovil] = useState(false)
  const [mostrarNouPlanter, setMostrarNouPlanter] = useState(false)
  const [guardant, setGuardant] = useState(false)
  const [tooltipCella, setTooltipCella] = useState(null)
  const [cellaMobilInfo, setCellaMobilInfo] = useState(null)
  

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
    setCellaSeleccionada(cella)
    setCellaEstat(cella.estat)
    setCellaCultiuId(cella.cultiu_id?.toString() || '')
    setCellaVarietatId(cella.varietat_id?.toString() || '')
    setCellaData(cella.data_sembra || new Date().toISOString().split('T')[0])
    setCellaNotes(cella.notes || '')
    // Info mòbil
    if (cella.estat === 'sembrada') {
      setCellaMobilInfo(cella)
    } else {
      setCellaMobilInfo(null)
    }
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



  if (esMobil) return (
    <div style={{position:'fixed', inset:0, background:'white', display:'flex', flexDirection:'column', zIndex:1000}}>
      {/* Capçalera mòbil */}
      <div style={{background:'#1D9E75', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', flexShrink:0}}>
        {vistaMovil === 'graella' && (
          <button style={{background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer', padding:'0'}}
            onClick={() => { setVistaMovil('llista'); setPlanterActiu(null); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
            ←
          </button>
        )}
        <div style={{flex:1, color:'white', fontWeight:'600', fontSize:'16px'}}>
          {vistaMovil === 'llista' ? '🌱 Planters' : planterActiu?.nom || 'Planter'}
        </div>
        {vistaMovil === 'llista' && (
          <button style={{background:'rgba(255,255,255,0.2)', border:'none', color:'white', borderRadius:'8px', padding:'6px 12px', fontSize:'13px', cursor:'pointer'}}
            onClick={() => setMostrarNouPlanter(true)}>
            + Nou
          </button>
        )}
        {vistaMovil === 'graella' && planterActiu?.estat === 'actiu' && (
          <button style={{background:'rgba(255,255,255,0.2)', border:'none', color:'white', borderRadius:'8px', padding:'6px 10px', fontSize:'12px', cursor:'pointer'}}
            onClick={() => { if(window.confirm('Marcar com a gastat?')) marcarGastat(planterActiu) }}>
            ✓ Gastat
          </button>
        )}
        <button style={{background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer'}}
          onClick={onTancar}>✕</button>
      </div>

      {/* Vista llista de planters */}
      {vistaMovil === 'llista' && (
        <div style={{flex:1, overflowY:'auto', padding:'12px'}}>
          {planters.length === 0 && (
            <div style={{textAlign:'center', color:'#aaa', padding:'40px', fontSize:'14px'}}>
              <div style={{fontSize:'40px', marginBottom:'12px'}}>🌱</div>
              Crea un planter amb "+ Nou"
            </div>
          )}
          {plantersActius.length > 0 && (
            <>
              <div style={{fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', marginBottom:'8px'}}>Actius</div>
              {plantersActius.map(p => (
                <div key={p.id} style={{border:'1px solid #eee', borderRadius:'10px', padding:'14px', marginBottom:'8px', cursor:'pointer'}}
                  onClick={() => { setPlanterActiu(p); carregaCelles(p.id); setVistaMovil('graella'); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
                  <div style={{fontSize:'15px', fontWeight:'600', color:'#333'}}>{p.nom}</div>
                  <div style={{fontSize:'12px', color:'#888', marginTop:'4px'}}>{p.files}×{p.columnes} cel·les · {p.ubicacio} · {new Date(p.data_inici).toLocaleDateString('ca-ES')}</div>
                </div>
              ))}
            </>
          )}
          {plantersGastats.length > 0 && (
            <>
              <div style={{fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', marginBottom:'8px', marginTop:'16px'}}>Gastats</div>
              {plantersGastats.map(p => (
                <div key={p.id} style={{border:'1px solid #eee', borderRadius:'10px', padding:'14px', marginBottom:'8px', cursor:'pointer', opacity:0.6}}
                  onClick={() => { setPlanterActiu(p); carregaCelles(p.id); setVistaMovil('graella'); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
                  <div style={{fontSize:'15px', fontWeight:'600', color:'#333'}}>{p.nom}</div>
                  <div style={{fontSize:'12px', color:'#888', marginTop:'4px'}}>{p.files}×{p.columnes} cel·les · {p.ubicacio}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Vista graella */}
      {vistaMovil === 'graella' && planterActiu && (
        <div style={{flex:1, overflow:'auto', position:'relative'}}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${planterActiu.columnes}, minmax(36px, 50px))`,
            gap: '3px',
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
                    onClick={() => { if(cella) { toggleCella(cella); setMostrarPanellMovil(true) } }}
                    style={{
                      aspectRatio: '1',
                      background: estaX ? '#ccc' : estaSembrada ? (cella.cultius?.color || '#C0DD97') : 'white',
                      border: seleccionada ? '2px solid #1D9E75' : '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                    {estaX ? (
                      <span style={{fontSize:'18px', fontWeight:'bold', color:'#888'}}>✕</span>
                    ) : estaSembrada ? (
                      <>
                        <span style={{fontSize:'9px', fontWeight:'600', color:'#333', textAlign:'center', lineHeight:1.2, padding:'1px'}}>
                          {cella.cultius?.nom?.substring(0,8)}
                        </span>
                        {cella.varietats?.nom && cella.varietats.nom !== '-' && (
                          <span style={{fontSize:'8px', color:'#555', textAlign:'center'}}>
                            {cella.varietats.nom.substring(0,8)}
                          </span>
                        )}
                      </>
                    ) : null}
                    {seleccionada && (
                      <div style={{position:'absolute', top:'2px', right:'3px', fontSize:'10px', color:'#1D9E75'}}>✓</div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Llegenda */}
          <div style={{display:'flex', gap:'12px', padding:'8px 12px', borderTop:'1px solid #eee', flexShrink:0}}>
            <div style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#666'}}>
              <div style={{width:'12px', height:'12px', borderRadius:'2px', background:'white', border:'1px solid #ddd'}}/> Buida
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#666'}}>
              <div style={{width:'12px', height:'12px', borderRadius:'2px', background:'#ccc'}}/> No usada
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#666'}}>
              <div style={{width:'12px', height:'12px', borderRadius:'2px', background:'#C0DD97'}}/> Sembrada
            </div>
          </div>

          {/* Banda inferior info cel·la mòbil */}
          {cellaMobilInfo && !mostrarPanellMovil && (
            <div style={{position:'absolute', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #eee', borderRadius:'16px 16px 0 0', padding:'12px 16px', boxShadow:'0 -4px 20px rgba(0,0,0,0.1)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:'13px', fontWeight:'600', color:'#333', marginBottom:'4px'}}>
                    Cel·la {cellaMobilInfo.fila},{cellaMobilInfo.columna}
                  </div>
                  {cellaMobilInfo.cultius?.nom && (
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                      <div style={{width:'10px', height:'10px', borderRadius:'2px', background:cellaMobilInfo.cultius?.color||'#ddd'}}/>
                      <span style={{fontSize:'13px', fontWeight:'500'}}>{cellaMobilInfo.cultius.nom}</span>
                      {cellaMobilInfo.varietats?.nom && cellaMobilInfo.varietats.nom !== '-' && (
                        <span style={{fontSize:'12px', color:'#888'}}>· {cellaMobilInfo.varietats.nom}</span>
                      )}
                    </div>
                  )}
                  {cellaMobilInfo.data_sembra && <div style={{fontSize:'11px', color:'#aaa', marginTop:'2px'}}>{new Date(cellaMobilInfo.data_sembra).toLocaleDateString('ca-ES')}</div>}
                  {cellaMobilInfo.notes && <div style={{fontSize:'12px', color:'#666', marginTop:'4px'}}>💬 {cellaMobilInfo.notes}</div>}
                </div>
                <div style={{display:'flex', gap:'8px'}}>
                  <button style={{padding:'6px 12px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', fontSize:'12px', cursor:'pointer'}}
                    onClick={() => setMostrarPanellMovil(true)}>
                    Editar
                  </button>
                  <button style={{background:'none', border:'none', fontSize:'18px', color:'#aaa', cursor:'pointer'}}
                    onClick={() => { setCellaMobilInfo(null); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>✕</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panell edició cel·la mòbil — full screen */}
      {mostrarPanellMovil && (cellaSeleccionada || cellesSeleccionades.length > 0) && (
        <div style={{position:'absolute', inset:0, background:'white', display:'flex', flexDirection:'column', zIndex:10}}>
          <div style={{background:'#1D9E75', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', flexShrink:0}}>
            <button style={{background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer'}}
              onClick={() => { setMostrarPanellMovil(false) }}>←</button>
            <div style={{color:'white', fontWeight:'600', fontSize:'15px'}}>
              {cellesSeleccionades.length > 1 ? `${cellesSeleccionades.length} cel·les` : `Cel·la ${cellaSeleccionada?.fila},${cellaSeleccionada?.columna}`}
            </div>
          </div>
          <div style={{flex:1, overflowY:'auto', padding:'16px'}}>
            <div style={{marginBottom:'12px'}}>
              <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'6px'}}>Estat</label>
              <div style={{display:'flex', gap:'8px'}}>
                {[{val:'buida',label:'Buida',icon:'○'},{val:'x',label:'No usada',icon:'✕'},{val:'sembrada',label:'Sembrada',icon:'🌱'}].map(o => (
                  <div key={o.val}
                    style={{flex:1, padding:'10px 6px', border:'1px solid #ddd', borderRadius:'8px', textAlign:'center', cursor:'pointer', fontSize:'13px',
                      ...(cellaEstat===o.val?{background:'#E1F5EE', borderColor:'#1D9E75', color:'#0F6E56', fontWeight:'500'}:{color:'#333'})}}
                    onClick={() => setCellaEstat(o.val)}>
                    <div style={{fontSize:'18px'}}>{o.icon}</div>
                    {o.label}
                  </div>
                ))}
              </div>
            </div>

            {cellaEstat === 'sembrada' && (
              <>
                <div style={{marginBottom:'12px'}}>
                  <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Data sembra</label>
                  <input type="date" style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box'}}
                    value={cellaData} onChange={e => setCellaData(e.target.value)}/>
                </div>
                <div style={{marginBottom:'12px'}}>
                  <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Cultiu</label>
                  <select style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box'}}
                    value={cellaCultiuId} onChange={e => setCellaCultiuId(e.target.value)}>
                    <option value="">— cap —</option>
                    {cultius.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
                {varietats.length > 0 && (
                  <div style={{marginBottom:'12px'}}>
                    <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Varietat</label>
                    <select style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box'}}
                      value={cellaVarietatId} onChange={e => setCellaVarietatId(e.target.value)}>
                      <option value="">— cap —</option>
                      {varietats.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            <div style={{marginBottom:'12px'}}>
              <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Notes</label>
              <textarea style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', height:'80px', resize:'none'}}
                value={cellaNotes} onChange={e => setCellaNotes(e.target.value)}/>
            </div>
          </div>
          <div style={{padding:'16px', borderTop:'1px solid #eee', display:'flex', gap:'10px'}}>
            <button style={{flex:1, padding:'14px', background:'#1D9E75', color:'white', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}
              onClick={() => { guardarCella(); setMostrarPanellMovil(false) }} disabled={guardant}>
              {guardant ? 'Guardant...' : '💾 Guardar'}
            </button>
            <button style={{padding:'14px 20px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'10px', fontSize:'15px', cursor:'pointer'}}
              onClick={() => { setMostrarPanellMovil(false); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
              Cancel·lar
            </button>
          </div>
        </div>
      )}

      {/* Modal nou planter */}
      {mostrarNouPlanter && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', zIndex:2000}}>
          <div style={{background:'white', width:'100%', borderRadius:'16px 16px 0 0', padding:'20px', maxHeight:'80vh', overflowY:'auto'}}>
            <div style={{fontSize:'16px', fontWeight:'600', color:'#333', marginBottom:'16px'}}>Nou planter</div>
            <div style={{marginBottom:'12px'}}>
              <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Nom (opcional)</label>
              <input style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box'}}
                value={nouNom} onChange={e => setNouNom(e.target.value)} placeholder={`Planter ${new Date().toLocaleDateString('ca-ES')}`}/>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px'}}>
              <div>
                <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Files</label>
                <input type="number" style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box'}}
                  value={nouFiles} min="1" max="20" onChange={e => setNouFiles(parseInt(e.target.value)||1)}/>
              </div>
              <div>
                <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Columnes</label>
                <input type="number" style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box'}}
                  value={nouColumnes} min="1" max="30" onChange={e => setNouColumnes(parseInt(e.target.value)||1)}/>
              </div>
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Ubicació</label>
              <select style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box'}}
                value={nouUbicacio} onChange={e => setNouUbicacio(e.target.value)}>
                <option value="Casa">Casa</option>
                <option value="All">All</option>
                <option value="Begues">Begues</option>
                <option value="Estoll">Estoll</option>
                <option value="Alp">Alp</option>
                <option value="Altre">Altre</option>
              </select>
            </div>
            <div style={{background:'#f0f9f5', border:'1px solid #b5e0d0', borderRadius:'8px', padding:'10px', fontSize:'12px', color:'#555', marginBottom:'16px'}}>
              Graella de {nouFiles}×{nouColumnes} = {nouFiles*nouColumnes} cel·les
            </div>
            <div style={{display:'flex', gap:'10px'}}>
              <button style={{flex:1, padding:'14px', background:'#1D9E75', color:'white', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}
                onClick={crearPlanter} disabled={guardant}>
                {guardant ? 'Creant...' : 'Crear planter'}
              </button>
              <button style={{padding:'14px 20px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'10px', fontSize:'15px', cursor:'pointer'}}
                onClick={() => setMostrarNouPlanter(false)}>
                Cancel·lar
              </button>
            </div>
          </div>
        </div>
      )}
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
  panell: { width:'220px', borderLeft:'1px solid #eee', padding:'14px', overflowY:'auto', flexShrink:0, display:'flex', flexDirection:'column' },
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
