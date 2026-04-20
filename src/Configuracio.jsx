import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Configuracio({ onTancar }) {
  const [seccio, setSeccio] = useState('cultius')
  const [cultius, setCultius] = useState([])
  const [varietats, setVarietats] = useState([])
  const [tasques, setTasques] = useState([])
  const [subtasques, setSubtasques] = useState([])
  const [cultiuSeleccionat, setCultiuSeleccionat] = useState(null)
  const [tascaSeleccionada, setTascaSeleccionada] = useState(null)
  const [editant, setEditant] = useState(null)
  const [nomNou, setNomNou] = useState('')
  const [colorNou, setColorNou] = useState('#C0DD97')
  const [plurianualNou, setPlurianualNou] = useState(false)
  const [unitatNou, setUnitatNou] = useState('')
  const [guardant, setGuardant] = useState(false)

  const COLORS = ['#FAC775','#C0DD97','#9FE1CB','#F5C4B3','#F4C0D1','#B5D4F4','#D3D1C7','#F7C1C1','#EAF3DE','#D4B5F4','#FFE4B5','#98FB98']

  useEffect(() => { carregaDades() }, [])
  useEffect(() => { if (cultiuSeleccionat) carregaVarietats(cultiuSeleccionat.id) }, [cultiuSeleccionat])
  useEffect(() => { if (tascaSeleccionada) carregaSubtasques(tascaSeleccionada.id) }, [tascaSeleccionada])

  async function carregaDades() {
    const [c, t] = await Promise.all([
      supabase.from('cultius').select('*').order('nom'),
      supabase.from('tasques').select('*').order('nom'),
    ])
    setCultius(c.data || [])
    setTasques(t.data || [])
  }

  async function carregaVarietats(cultiuId) {
    const { data } = await supabase.from('varietats').select('*').eq('cultiu_id', cultiuId).order('nom')
    setVarietats(data || [])
  }

  async function carregaSubtasques(tascaId) {
    const { data } = await supabase.from('subtasques').select('*').eq('tasca_id', tascaId).order('nom')
    setSubtasques(data || [])
  }

  function iniciarEdicio(item, tipus) {
    setEditant({ item, tipus })
    setNomNou(item.nom || '')
    setColorNou(item.color || '#C0DD97')
    setPlurianualNou(item.plurianual || false)
    setUnitatNou(item.unitat || '')
  }

  function iniciarNou(tipus) {
    setEditant({ item: null, tipus })
    setNomNou('')
    setColorNou('#C0DD97')
    setPlurianualNou(false)
    setUnitatNou('')
  }

  async function guardar() {
    if (!nomNou.trim()) return
    setGuardant(true)
    const { tipus, item } = editant

    if (tipus === 'cultiu') {
      const dades = { nom: nomNou, color: colorNou, plurianual: plurianualNou }
      if (item) await supabase.from('cultius').update(dades).eq('id', item.id)
      else await supabase.from('cultius').insert(dades)
      await carregaDades()
    } else if (tipus === 'varietat') {
      const dades = { nom: nomNou, cultiu_id: cultiuSeleccionat.id }
      if (item) await supabase.from('varietats').update(dades).eq('id', item.id)
      else await supabase.from('varietats').insert(dades)
      await carregaVarietats(cultiuSeleccionat.id)
    } else if (tipus === 'tasca') {
      const dades = { nom: nomNou, unitat: unitatNou || null }
      if (item) await supabase.from('tasques').update(dades).eq('id', item.id)
      else await supabase.from('tasques').insert(dades)
      await carregaDades()
    } else if (tipus === 'subtasca') {
      const dades = { nom: nomNou, tasca_id: tascaSeleccionada.id }
      if (item) await supabase.from('subtasques').update(dades).eq('id', item.id)
      else await supabase.from('subtasques').insert(dades)
      await carregaSubtasques(tascaSeleccionada.id)
    }

    setEditant(null)
    setGuardant(false)
  }

  async function eliminar() {
    if (!editant?.item) return
    const { tipus, item } = editant
    const taula = { cultiu:'cultius', varietat:'varietats', tasca:'tasques', subtasca:'subtasques' }[tipus]
    await supabase.from(taula).delete().eq('id', item.id)
    setEditant(null)
    if (tipus === 'cultiu') { await carregaDades(); setCultiuSeleccionat(null); setVarietats([]) }
    else if (tipus === 'varietat') await carregaVarietats(cultiuSeleccionat.id)
    else if (tipus === 'tasca') { await carregaDades(); setTascaSeleccionada(null); setSubtasques([]) }
    else if (tipus === 'subtasca') await carregaSubtasques(tascaSeleccionada.id)
  }

  const seccions = [
    { id:'cultius', label:'Cultius i varietats' },
    { id:'tasques', label:'Tasques i subtasques' },
  ]

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={styles.titol}>Configuració</div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

        <div style={styles.tabs}>
          {seccions.map(s => (
            <button key={s.id}
              style={{...styles.tab, ...(seccio===s.id?styles.tabActiu:{})}}
              onClick={() => { setSeccio(s.id); setEditant(null) }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={styles.cos}>
          {seccio === 'cultius' && (
            <div style={styles.tresColumnes}>
              {/* Cultius */}
              <div style={styles.columna}>
                <div style={styles.columnaHeader}>
                  <div style={styles.columnaTitol}>Cultius</div>
                  <button style={styles.botoNou} onClick={() => iniciarNou('cultiu')}>+</button>
                </div>
                <div style={styles.llista}>
                  {cultius.map(c => (
                    <div key={c.id}
                      style={{...styles.item, ...(cultiuSeleccionat?.id===c.id?styles.itemActiu:{})}}
                      onClick={() => { setCultiuSeleccionat(c); setTascaSeleccionada(null) }}>
                      <div style={{width:'10px',height:'10px',borderRadius:'2px',background:c.color||'#ddd',flexShrink:0}}/>
                      <span style={styles.itemNom}>{c.nom}</span>
                      <span style={styles.itemTag}>{c.plurianual?'🌳':'🌱'}</span>
                      <button style={styles.botoEdit} onClick={e => { e.stopPropagation(); iniciarEdicio(c,'cultiu') }}>✏️</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Varietats */}
              <div style={styles.columna}>
                <div style={styles.columnaHeader}>
                  <div style={styles.columnaTitol}>
                    {cultiuSeleccionat ? `Varietats de ${cultiuSeleccionat.nom}` : 'Selecciona un cultiu'}
                  </div>
                  {cultiuSeleccionat && (
                    <button style={styles.botoNou} onClick={() => iniciarNou('varietat')}>+</button>
                  )}
                </div>
                <div style={styles.llista}>
                  {varietats.map(v => (
                    <div key={v.id} style={styles.item}>
                      <span style={styles.itemNom}>{v.nom}</span>
                      <button style={styles.botoEdit} onClick={() => iniciarEdicio(v,'varietat')}>✏️</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulari edició */}
              <div style={styles.columna}>
                {editant ? (
                  <div>
                    <div style={styles.columnaTitol}>
                      {editant.item ? 'Editar' : 'Nou'} {editant.tipus}
                    </div>
                    <div style={styles.grup}>
                      <label style={styles.label}>Nom</label>
                      <input style={styles.input} value={nomNou}
                        onChange={e => setNomNou(e.target.value)}
                        placeholder="Nom..." autoFocus/>
                    </div>
                    {editant.tipus === 'cultiu' && (
                      <>
                        <div style={styles.grup}>
                          <label style={styles.label}>Color</label>
                          <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                            {COLORS.map(c => (
                              <div key={c} onClick={() => setColorNou(c)}
                                style={{width:'22px',height:'22px',borderRadius:'4px',background:c,
                                  border:colorNou===c?'2.5px solid #1D9E75':'1px solid rgba(0,0,0,0.15)',cursor:'pointer'}}/>
                            ))}
                          </div>
                        </div>
                        <div style={styles.grup}>
                          <label style={styles.label}>
                            <input type="checkbox" checked={plurianualNou}
                              onChange={e => setPlurianualNou(e.target.checked)}
                              style={{marginRight:'6px'}}/>
                            Plurianual (arbre, maduixera...)
                          </label>
                        </div>
                      </>
                    )}
                    <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                      <button style={styles.botoPrimari} onClick={guardar} disabled={guardant}>
                        {guardant ? '...' : 'Guardar'}
                      </button>
                      <button style={styles.botoCancel} onClick={() => setEditant(null)}>Cancel·lar</button>
                    </div>
                    {editant.item && (
                      <button style={styles.botoEliminar} onClick={eliminar}>
                        Eliminar
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{color:'#aaa',fontSize:'13px',marginTop:'20px'}}>
                    Clica ✏️ per editar o + per afegir
                  </div>
                )}
              </div>
            </div>
          )}

          {seccio === 'tasques' && (
            <div style={styles.tresColumnes}>
              {/* Tasques */}
              <div style={styles.columna}>
                <div style={styles.columnaHeader}>
                  <div style={styles.columnaTitol}>Tasques</div>
                  <button style={styles.botoNou} onClick={() => iniciarNou('tasca')}>+</button>
                </div>
                <div style={styles.llista}>
                  {tasques.map(t => (
                    <div key={t.id}
                      style={{...styles.item, ...(tascaSeleccionada?.id===t.id?styles.itemActiu:{})}}
                      onClick={() => { setTascaSeleccionada(t); setCultiuSeleccionat(null) }}>
                      <span style={styles.itemNom}>{t.nom}</span>
                      {t.unitat && <span style={styles.itemTag}>{t.unitat}</span>}
                      <button style={styles.botoEdit} onClick={e => { e.stopPropagation(); iniciarEdicio(t,'tasca') }}>✏️</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtasques */}
              <div style={styles.columna}>
                <div style={styles.columnaHeader}>
                  <div style={styles.columnaTitol}>
                    {tascaSeleccionada ? `Subtasques de ${tascaSeleccionada.nom}` : 'Selecciona una tasca'}
                  </div>
                  {tascaSeleccionada && (
                    <button style={styles.botoNou} onClick={() => iniciarNou('subtasca')}>+</button>
                  )}
                </div>
                <div style={styles.llista}>
                  {subtasques.map(s => (
                    <div key={s.id} style={styles.item}>
                      <span style={styles.itemNom}>{s.nom}</span>
                      <button style={styles.botoEdit} onClick={() => iniciarEdicio(s,'subtasca')}>✏️</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulari edició */}
              <div style={styles.columna}>
                {editant ? (
                  <div>
                    <div style={styles.columnaTitol}>
                      {editant.item ? 'Editar' : 'Nova'} {editant.tipus}
                    </div>
                    <div style={styles.grup}>
                      <label style={styles.label}>Nom</label>
                      <input style={styles.input} value={nomNou}
                        onChange={e => setNomNou(e.target.value)}
                        placeholder="Nom..." autoFocus/>
                    </div>
                    {editant.tipus === 'tasca' && (
                      <div style={styles.grup}>
                        <label style={styles.label}>Unitat (opcional)</label>
                        <input style={styles.input} value={unitatNou}
                          onChange={e => setUnitatNou(e.target.value)}
                          placeholder="ex: kg, litres, unitats..."/>
                      </div>
                    )}
                    <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                      <button style={styles.botoPrimari} onClick={guardar} disabled={guardant}>
                        {guardant ? '...' : 'Guardar'}
                      </button>
                      <button style={styles.botoCancel} onClick={() => setEditant(null)}>Cancel·lar</button>
                    </div>
                    {editant.item && (
                      <button style={styles.botoEliminar} onClick={eliminar}>
                        Eliminar
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{color:'#aaa',fontSize:'13px',marginTop:'20px'}}>
                    Clica ✏️ per editar o + per afegir
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(900px, 97vw)', height:'85vh', display:'flex', flexDirection:'column' },
  cap: { padding:'14px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  titol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999' },
  tabs: { display:'flex', gap:'4px', padding:'10px 16px', borderBottom:'1px solid #eee', flexShrink:0 },
  tab: { padding:'7px 16px', border:'1px solid #ddd', borderRadius:'20px', cursor:'pointer', background:'white', color:'#666', fontSize:'13px' },
  tabActiu: { background:'#1D9E75', color:'white', borderColor:'#1D9E75', fontWeight:'500' },
  cos: { flex:1, overflow:'hidden', padding:'16px' },
  tresColumnes: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px', height:'100%' },
  columna: { display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid #eee', borderRadius:'8px' },
  columnaHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderBottom:'1px solid #eee', flexShrink:0 },
  columnaTitol: { fontSize:'13px', fontWeight:'600', color:'#333' },
  botoNou: { width:'24px', height:'24px', background:'#1D9E75', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' },
  llista: { flex:1, overflowY:'auto', padding:'6px' },
  item: { display:'flex', alignItems:'center', gap:'6px', padding:'7px 8px', borderRadius:'6px', cursor:'pointer', marginBottom:'2px' },
  itemActiu: { background:'#E1F5EE' },
  itemNom: { flex:1, fontSize:'13px', color:'#333' },
  itemTag: { fontSize:'11px', color:'#aaa' },
  botoEdit: { background:'none', border:'none', cursor:'pointer', fontSize:'13px', opacity:0.5, padding:'0 2px' },
  grup: { marginBottom:'12px', padding:'0 12px' },
  label: { display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' },
  input: { width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' },
  botoPrimari: { padding:'8px 16px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'500' },
  botoCancel: { padding:'8px 16px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
  botoEliminar: { width:'100%', padding:'8px', background:'white', color:'#e55', border:'1px solid #e55', borderRadius:'8px', cursor:'pointer', fontSize:'13px', marginTop:'8px' },
}
