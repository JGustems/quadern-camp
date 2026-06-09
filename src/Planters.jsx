import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Planters({ onTancar }) {
  const [planters, setPlanters] = useState([])
  const [planterActiu, setPlanterActiu] = useState(null)
  const [cellesActives, setCellesActives] = useState([])
  const [cultius, setCultius] = useState([])
  const [varietats, setVarietats] = useState([])
  const [cellaSeleccionada, setCellaSeleccionada] = useState(null)
  const [cellesSeleccionades, setCellesSeleccionades] = useState([])
  const [mostrarNouPlanter, setMostrarNouPlanter] = useState(false)
  const [guardant, setGuardant] = useState(false)
  const [tooltipCella, setTooltipCella] = useState(null)
  const [cellaMobilInfo, setCellaMobilInfo] = useState(null)
  const [vistaMovil, setVistaMovil] = useState('llista')
  const [mostrarPanellMovil, setMostrarPanellMovil] = useState(false)

  const [nouNom, setNouNom] = useState('')
  const [nouFiles, setNouFiles] = useState(4)
  const [nouColumnes, setNouColumnes] = useState(6)
  const [nouUbicacio, setNouUbicacio] = useState('Casa')

  const [cellaEstat, setCellaEstat] = useState('buida')
  const [cellaCultiuId, setCellaCultiuId] = useState('')
  const [cellaVarietatId, setCellaVarietatId] = useState('')
  const [cellaData, setCellaData] = useState(new Date().toISOString().split('T')[0])
  const [cellaNotes, setCellaNotes] = useState('')

  const esMobil = window.innerWidth < 768

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
      files: nouFiles, columnes: nouColumnes, ubicacio: nouUbicacio,
    }).select().single()
    if (planter) {
      const celles = []
      for (let f=1; f<=nouFiles; f++)
        for (let c=1; c<=nouColumnes; c++)
          celles.push({ planter_id: planter.id, fila: f, columna: c, estat: 'buida' })
      await supabase.from('planter_cel·les').insert(celles)
      await carregaDades()
      setPlanterActiu(planter)
      setMostrarNouPlanter(false)
      if (esMobil) setVistaMovil('graella')
    }
    setGuardant(false)
  }

  async function marcarGastat(planter) {
    await supabase.from('planters').update({
      estat: 'gastat', data_fi: new Date().toISOString().split('T')[0]
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
        cultiu_id: cellaEstat==='sembrada' ? (cellaCultiuId?parseInt(cellaCultiuId):null) : null,
        varietat_id: cellaEstat==='sembrada' ? (cellaVarietatId?parseInt(cellaVarietatId):null) : null,
        data_sembra: cellaEstat==='sembrada' ? cellaData : null,
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
    if (cella.estat === 'sembrada') setCellaMobilInfo(cella)
    else setCellaMobilInfo(null)
  }

  const plantersActius = planters.filter(p => p.estat === 'actiu')
  const plantersGastats = planters.filter(p => p.estat === 'gastat')

  // ── GRAELLA compartida PC i mòbil ──────────────────────────
  function Graella() {
    if (!planterActiu) return null
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${planterActiu.columnes}, minmax(${esMobil?'36px':'28px'}, ${esMobil?'50px':'40px'}))`,
        gap: '2px', padding: '12px',
      }}>
        {Array.from({length: planterActiu.files}, (_,fi) =>
          Array.from({length: planterActiu.columnes}, (_,ci) => {
            const cella = cellesActives.find(c => c.fila===fi+1 && c.columna===ci+1)
            const sel = cellesSeleccionades.some(c => c.id === cella?.id)
            const estaX = cella?.estat === 'x'
            const estaSembrada = cella?.estat === 'sembrada'
            return (
              <div key={`${fi}-${ci}`}
                onClick={() => { if(cella) { toggleCella(cella) } }}
                onMouseEnter={e => {
                  if (esMobil || !cella || cella.estat==='buida' || cella.estat==='x') return
                  setTooltipCella({ x:e.clientX, y:e.clientY, cultiu:cella.cultius?.nom,
                    varietat:cella.varietats?.nom&&cella.varietats.nom!=='-'?cella.varietats.nom:null,
                    data:cella.data_sembra, notes:cella.notes, fila:cella.fila, columna:cella.columna })
                }}
                onMouseLeave={() => setTooltipCella(null)}
                style={{
                  aspectRatio:'1', background:estaX?'#ccc':estaSembrada?(cella.cultius?.color||'#C0DD97'):'white',
                  border:sel?'2px solid #1D9E75':'1px solid #ddd', borderRadius:'3px',
                  cursor:'pointer', display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative',
                }}>
                {estaX ? <span style={{fontSize:esMobil?'18px':'16px', fontWeight:'bold', color:'#888'}}>✕</span>
                : estaSembrada ? <>
                  <span style={{fontSize:esMobil?'9px':'8px', fontWeight:'600', color:'#333', textAlign:'center', lineHeight:1.2, padding:'1px'}}>
                    {cella.cultius?.nom?.substring(0,8)}
                  </span>
                  {cella.varietats?.nom && cella.varietats.nom!=='-' && (
                    <span style={{fontSize:esMobil?'8px':'7px', color:'#555', textAlign:'center'}}>
                      {cella.varietats.nom.substring(0,8)}
                    </span>
                  )}
                </> : null}
                {sel && <div style={{position:'absolute', top:'1px', right:'2px', fontSize:'8px', color:'#1D9E75'}}>✓</div>}
              </div>
            )
          })
        )}
      </div>
    )
  }

  // ── PANELL EDICIÓ compartit ────────────────────────────────
  function PanellEdicio({ estilWrapper }) {
    return (
      <div style={estilWrapper}>
        <div style={{fontSize:'14px', fontWeight:'600', color:'#333', marginBottom:'10px'}}>
          {cellesSeleccionades.length>1 ? `${cellesSeleccionades.length} cel·les` : `Cel·la ${cellaSeleccionada?.fila},${cellaSeleccionada?.columna}`}
        </div>
        {cellesSeleccionades.length>1 && <div style={{fontSize:'11px', color:'#888', marginBottom:'10px'}}>S'aplicarà a totes les cel·les seleccionades</div>}
        <div style={{marginBottom:'10px'}}>
          <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'6px'}}>Estat</label>
          <div style={{display:'flex', gap:'6px'}}>
            {[{val:'buida',label:'Buida',icon:'○'},{val:'x',label:'No usada',icon:'✕'},{val:'sembrada',label:'Sembrada',icon:'🌱'}].map(o => (
              <div key={o.val} onClick={() => setCellaEstat(o.val)}
                style={{flex:1, padding:'8px 4px', border:'1px solid #ddd', borderRadius:'8px', textAlign:'center', cursor:'pointer', fontSize:'12px',
                  ...(cellaEstat===o.val?{background:'#E1F5EE', borderColor:'#1D9E75', color:'#0F6E56', fontWeight:'500'}:{color:'#333'})}}>
                <div style={{fontSize:'16px'}}>{o.icon}</div>{o.label}
              </div>
            ))}
          </div>
        </div>
        {cellaEstat==='sembrada' && <>
          <div style={{marginBottom:'10px'}}>
            <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Data sembra</label>
            <input type="date" value={cellaData} onChange={e => setCellaData(e.target.value)}
              style={{width:'100%', padding:'8px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box'}}/>
          </div>
          <div style={{marginBottom:'10px'}}>
            <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Cultiu</label>
            <select value={cellaCultiuId} onChange={e => setCellaCultiuId(e.target.value)}
              style={{width:'100%', padding:'8px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box'}}>
              <option value="">— cap —</option>
              {cultius.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          {varietats.length>0 && <div style={{marginBottom:'10px'}}>
            <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Varietat</label>
            <select value={cellaVarietatId} onChange={e => setCellaVarietatId(e.target.value)}
              style={{width:'100%', padding:'8px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box'}}>
              <option value="">— cap —</option>
              {varietats.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
            </select>
          </div>}
        </>}
        <div style={{marginBottom:'10px'}}>
          <label style={{display:'block', fontSize:'11px', color:'#888', marginBottom:'4px'}}>Notes</label>
          <textarea value={cellaNotes} onChange={e => setCellaNotes(e.target.value)}
            style={{width:'100%', padding:'8px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box', height:'60px', resize:'vertical'}}/>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:'6px', marginTop:'auto', paddingTop:'10px'}}>
          <button onClick={() => { guardarCella(); if(esMobil) setMostrarPanellMovil(false) }} disabled={guardant}
            style={{padding:'10px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'500'}}>
            {guardant?'Guardant...':'💾 Guardar'}
          </button>
          <button onClick={() => { setCellaSeleccionada(null); setCellesSeleccionades([]); if(esMobil) setMostrarPanellMovil(false) }}
            style={{padding:'10px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontSize:'13px'}}>
            Cancel·lar
          </button>
        </div>
      </div>
    )
  }

  // ── MODAL NOU PLANTER compartit ───────────────────────────
  function ModalNouPlanter() {
    if (!mostrarNouPlanter) return null
    return (
      <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems: esMobil?'flex-end':'center', justifyContent:'center', zIndex:2000}}>
        <div style={{background:'white', width: esMobil?'100%':'340px', borderRadius: esMobil?'16px 16px 0 0':'10px', padding:'24px', maxHeight:'80vh', overflowY:'auto'}}>
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
            <button style={{flex:1, padding:'12px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'600'}}
              onClick={crearPlanter} disabled={guardant}>{guardant?'Creant...':'Crear planter'}</button>
            <button style={{padding:'12px 16px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontSize:'14px'}}
              onClick={() => setMostrarNouPlanter(false)}>Cancel·lar</button>
          </div>
        </div>
      </div>
    )
  }

  // ══ VISTA MÒBIL ══════════════════════════════════════════════
  if (esMobil) return (
    <div style={{position:'fixed', inset:0, background:'white', display:'flex', flexDirection:'column', zIndex:1000}}>
      <div style={{background:'#1D9E75', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', flexShrink:0}}>
        {vistaMovil==='graella' && (
          <button style={{background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer'}}
            onClick={() => { setVistaMovil('llista'); setPlanterActiu(null); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>←</button>
        )}
        <div style={{flex:1, color:'white', fontWeight:'600', fontSize:'16px'}}>
          {vistaMovil==='llista' ? '🌱 Planters' : planterActiu?.nom||'Planter'}
        </div>
        {vistaMovil==='llista' && (
          <button style={{background:'rgba(255,255,255,0.2)', border:'none', color:'white', borderRadius:'8px', padding:'6px 12px', fontSize:'13px', cursor:'pointer'}}
            onClick={() => setMostrarNouPlanter(true)}>+ Nou</button>
        )}
        {vistaMovil==='graella' && planterActiu?.estat==='actiu' && (
          <button style={{background:'rgba(255,255,255,0.2)', border:'none', color:'white', borderRadius:'8px', padding:'6px 10px', fontSize:'12px', cursor:'pointer'}}
            onClick={() => { if(window.confirm('Marcar com a gastat?')) marcarGastat(planterActiu) }}>✓ Gastat</button>
        )}
        <button style={{background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer'}} onClick={onTancar}>✕</button>
      </div>

      {vistaMovil==='llista' && (
        <div style={{flex:1, overflowY:'auto', padding:'12px'}}>
          {planters.length===0 && <div style={{textAlign:'center', color:'#aaa', padding:'40px'}}><div style={{fontSize:'40px', marginBottom:'12px'}}>🌱</div>Crea un planter amb "+ Nou"</div>}
          {plantersActius.length>0 && <>
            <div style={{fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', marginBottom:'8px'}}>Actius</div>
            {plantersActius.map(p => (
              <div key={p.id} style={{border:'1px solid #eee', borderRadius:'10px', padding:'14px', marginBottom:'8px', cursor:'pointer'}}
                onClick={() => { setPlanterActiu(p); carregaCelles(p.id); setVistaMovil('graella'); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
                <div style={{fontSize:'15px', fontWeight:'600', color:'#333'}}>{p.nom}</div>
                <div style={{fontSize:'12px', color:'#888', marginTop:'4px'}}>{p.files}×{p.columnes} · {p.ubicacio} · {new Date(p.data_inici).toLocaleDateString('ca-ES')}</div>
              </div>
            ))}
          </>}
          {plantersGastats.length>0 && <>
            <div style={{fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', marginBottom:'8px', marginTop:'16px'}}>Gastats</div>
            {plantersGastats.map(p => (
              <div key={p.id} style={{border:'1px solid #eee', borderRadius:'10px', padding:'14px', marginBottom:'8px', cursor:'pointer', opacity:0.6}}
                onClick={() => { setPlanterActiu(p); carregaCelles(p.id); setVistaMovil('graella'); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
                <div style={{fontSize:'15px', fontWeight:'600', color:'#333'}}>{p.nom}</div>
                <div style={{fontSize:'12px', color:'#888', marginTop:'4px'}}>{p.files}×{p.columnes} · {p.ubicacio}</div>
              </div>
            ))}
          </>}
        </div>
      )}

      {vistaMovil==='graella' && planterActiu && (
        <div style={{flex:1, overflow:'auto', position:'relative'}}>
          <Graella/>
          <div style={{display:'flex', gap:'12px', padding:'6px 12px', borderTop:'1px solid #eee'}}>
            <div style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#666'}}><div style={{width:'12px', height:'12px', borderRadius:'2px', background:'white', border:'1px solid #ddd'}}/> Buida</div>
            <div style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#666'}}><div style={{width:'12px', height:'12px', borderRadius:'2px', background:'#ccc'}}/> No usada</div>
            <div style={{display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'#666'}}><div style={{width:'12px', height:'12px', borderRadius:'2px', background:'#C0DD97'}}/> Sembrada</div>
          </div>
          {cellaMobilInfo && !mostrarPanellMovil && (
            <div style={{position:'absolute', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #eee', borderRadius:'16px 16px 0 0', padding:'12px 16px', boxShadow:'0 -4px 20px rgba(0,0,0,0.1)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:'13px', fontWeight:'600', color:'#333', marginBottom:'4px'}}>Cel·la {cellaMobilInfo.fila},{cellaMobilInfo.columna}</div>
                  {cellaMobilInfo.cultius?.nom && (
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                      <div style={{width:'10px', height:'10px', borderRadius:'2px', background:cellaMobilInfo.cultius?.color||'#ddd'}}/>
                      <span style={{fontSize:'13px', fontWeight:'500'}}>{cellaMobilInfo.cultius.nom}</span>
                      {cellaMobilInfo.varietats?.nom && cellaMobilInfo.varietats.nom!=='-' && <span style={{fontSize:'12px', color:'#888'}}>· {cellaMobilInfo.varietats.nom}</span>}
                    </div>
                  )}
                  {cellaMobilInfo.data_sembra && <div style={{fontSize:'11px', color:'#aaa', marginTop:'2px'}}>{new Date(cellaMobilInfo.data_sembra).toLocaleDateString('ca-ES')}</div>}
                  {cellaMobilInfo.notes && <div style={{fontSize:'12px', color:'#666', marginTop:'4px'}}>💬 {cellaMobilInfo.notes}</div>}
                </div>
                <div style={{display:'flex', gap:'8px'}}>
                  <button style={{padding:'6px 12px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', fontSize:'12px', cursor:'pointer'}}
                    onClick={() => setMostrarPanellMovil(true)}>Editar</button>
                  <button style={{background:'none', border:'none', fontSize:'18px', color:'#aaa', cursor:'pointer'}}
                    onClick={() => { setCellaMobilInfo(null); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>✕</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mostrarPanellMovil && (cellaSeleccionada||cellesSeleccionades.length>0) && (
        <div style={{position:'absolute', inset:0, background:'white', display:'flex', flexDirection:'column', zIndex:10}}>
          <div style={{background:'#1D9E75', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', flexShrink:0}}>
            <button style={{background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer'}}
              onClick={() => setMostrarPanellMovil(false)}>←</button>
            <div style={{color:'white', fontWeight:'600', fontSize:'15px'}}>
              {cellesSeleccionades.length>1 ? `${cellesSeleccionades.length} cel·les` : `Cel·la ${cellaSeleccionada?.fila},${cellaSeleccionada?.columna}`}
            </div>
          </div>
          <div style={{flex:1, overflowY:'auto', padding:'16px'}}>
            <PanellEdicio estilWrapper={{display:'flex', flexDirection:'column', height:'100%'}}/>
          </div>
        </div>
      )}

      <ModalNouPlanter/>
    </div>
  )

  // ══ VISTA PC ═════════════════════════════════════════════════
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
          <div style={styles.sidebar}>
            {plantersActius.length>0 && <>
              <div style={styles.seccio}>Actius ({plantersActius.length})</div>
              {plantersActius.map(p => (
                <div key={p.id} style={{...styles.planterItem, ...(planterActiu?.id===p.id?styles.planterActiu:{})}}
                  onClick={() => { setPlanterActiu(p); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
                  <div style={styles.planterNom}>{p.nom}</div>
                  <div style={styles.planterInfo}>{p.files}×{p.columnes} · {p.ubicacio}</div>
                  <div style={styles.planterData}>{new Date(p.data_inici).toLocaleDateString('ca-ES')}</div>
                </div>
              ))}
            </>}
            {plantersGastats.length>0 && <>
              <div style={{...styles.seccio, marginTop:'16px'}}>Gastats ({plantersGastats.length})</div>
              {plantersGastats.map(p => (
                <div key={p.id} style={{...styles.planterItem, opacity:0.6, ...(planterActiu?.id===p.id?styles.planterActiu:{})}}
                  onClick={() => { setPlanterActiu(p); setCellaSeleccionada(null); setCellesSeleccionades([]) }}>
                  <div style={styles.planterNom}>{p.nom}</div>
                  <div style={styles.planterInfo}>{p.files}×{p.columnes} · {p.ubicacio}</div>
                </div>
              ))}
            </>}
            {planters.length===0 && <div style={{color:'#aaa', fontSize:'13px', padding:'12px'}}>Crea'n un amb "+ Nou planter".</div>}
          </div>

          <div style={styles.principal}>
            {planterActiu ? (
              <div style={{display:'flex', flexDirection:'column', height:'100%'}}>
                <div style={styles.planterHeader}>
                  <div style={{flex:1}}>
                    <input
                      style={{fontSize:'15px', fontWeight:'600', color:'#333', border:'none', borderBottom:'1px solid transparent', background:'transparent', padding:'2px 4px', borderRadius:'4px', flex:1}}
                      value={planterActiu.nom}
                      onChange={async e => {
                        const nouNomVal = e.target.value
                        setPlanterActiu(prev => ({...prev, nom:nouNomVal}))
                        setPlanters(prev => prev.map(p => p.id===planterActiu.id ? {...p, nom:nouNomVal} : p))
                        await supabase.from('planters').update({nom:nouNomVal}).eq('id', planterActiu.id)
                      }}
                      onFocus={e => e.target.style.borderBottomColor='#1D9E75'}
                      onBlur={e => e.target.style.borderBottomColor='transparent'}
                    />
                    <div style={styles.planterSubtitol}>
                      {planterActiu.files}×{planterActiu.columnes} · {planterActiu.ubicacio}
                      {planterActiu.estat==='gastat' && <span style={styles.badgeGastat}>Gastat</span>}
                    </div>
                  </div>
                  {planterActiu.estat==='actiu' && (
                    <button style={styles.botoGastat}
                      onClick={() => { if(window.confirm('Marcar com a gastat?')) marcarGastat(planterActiu) }}>
                      ✓ Marcar com gastat
                    </button>
                  )}
                </div>
                <div style={styles.graellaWrap}><Graella/></div>
                <div style={styles.llegenda}>
                  <div style={styles.llegendaItem}><div style={{...styles.llegendaDot, background:'white', border:'1px solid #ddd'}}/> Buida</div>
                  <div style={styles.llegendaItem}><div style={{...styles.llegendaDot, background:'#ccc'}}/> No usada</div>
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

          {(cellaSeleccionada||cellesSeleccionades.length>0) && (
            <PanellEdicio estilWrapper={{...styles.panell}}/>
          )}
        </div>

        <ModalNouPlanter/>

        {tooltipCella && (
          <div style={{position:'fixed', left:tooltipCella.x+12, top:tooltipCella.y-10, background:'rgba(0,0,0,0.85)', color:'white', padding:'8px 12px', borderRadius:'8px', fontSize:'12px', pointerEvents:'none', zIndex:2000, maxWidth:'200px', lineHeight:'1.6'}}>
            <div style={{fontWeight:'600', marginBottom:'4px'}}>Cel·la {tooltipCella.fila},{tooltipCella.columna}</div>
            {tooltipCella.cultiu && <div>{tooltipCella.cultiu}{tooltipCella.varietat?` · ${tooltipCella.varietat}`:''}</div>}
            {tooltipCella.data && <div style={{color:'#aaa', fontSize:'11px'}}>{new Date(tooltipCella.data).toLocaleDateString('ca-ES')}</div>}
            {tooltipCella.notes && <div style={{color:'#ccc', fontSize:'11px', marginTop:'4px'}}>💬 {tooltipCella.notes}</div>}
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
  principal: { flex:1, overflow:'hidden', display:'flex', flexDirection:'column', position:'relative' },
  planterHeader: { padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  planterSubtitol: { fontSize:'12px', color:'#888', marginTop:'2px', display:'flex', alignItems:'center', gap:'8px' },
  badgeGastat: { background:'#f0f0f0', color:'#888', padding:'2px 8px', borderRadius:'20px', fontSize:'11px' },
  botoGastat: { padding:'7px 14px', background:'white', color:'#1D9E75', border:'1px solid #1D9E75', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
  graellaWrap: { flex:1, overflow:'auto' },
  llegenda: { display:'flex', gap:'16px', padding:'8px 16px', borderTop:'1px solid #eee', flexShrink:0 },
  llegendaItem: { display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#666' },
  llegendaDot: { width:'14px', height:'14px', borderRadius:'3px' },
  panell: { width:'220px', borderLeft:'1px solid #eee', padding:'14px', overflowY:'auto', flexShrink:0, display:'flex', flexDirection:'column' },
  centrat: { display:'flex', alignItems:'center', justifyContent:'center', height:'100%' },
}
