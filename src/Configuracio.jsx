import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Configuracio({ onTancar, onActualitzar }) {
  const [seccio, setSeccio] = useState('cultius')

  const seccions = [
    { id:'cultius', label:'Cultius i varietats' },
    { id:'tasques', label:'Tasques i subtasques' },
    { id:'tipuszones', label:'Tipus de zones' },
    { id:'camps', label:'Pobles i camps' },
  ]

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={styles.titol}>⚙️ Configuració</div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>
        <div style={styles.tabs}>
          {seccions.map(s => (
            <button key={s.id}
              style={{...styles.tab, ...(seccio===s.id?styles.tabActiu:{})}}
              onClick={() => setSeccio(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div style={styles.cos}>
          {seccio === 'cultius' && <SeccioCultius />}
          {seccio === 'tasques' && <SeccioTasques />}
          {seccio === 'tipuszones' && <SeccioTipusZones />}
          {seccio === 'camps' && <SeccioCamps onActualitzar={onActualitzar} />}
        </div>
      </div>
    </div>
  )
}

// ─── CULTIUS ────────────────────────────────────────────────
function SeccioCultius() {
  const [cultius, setCultius] = useState([])
  const [varietats, setVarietats] = useState([])
  const [cultiuSeleccionat, setCultiuSeleccionat] = useState(null)
  const [editant, setEditant] = useState(null)
  const [nomNou, setNomNou] = useState('')
  const [colorNou, setColorNou] = useState('#C0DD97')
  const [plurianualNou, setPlurianualNou] = useState(false)
  const [guardant, setGuardant] = useState(false)

  const COLORS = ['#FAC775','#C0DD97','#9FE1CB','#F5C4B3','#F4C0D1','#B5D4F4','#D3D1C7','#F7C1C1','#EAF3DE','#D4B5F4','#FFE4B5','#98FB98']

  useEffect(() => { carregaCultius() }, [])
  useEffect(() => { if (cultiuSeleccionat) carregaVarietats(cultiuSeleccionat.id) }, [cultiuSeleccionat])

  async function carregaCultius() {
    const { data } = await supabase.from('cultius').select('*').order('nom')
    setCultius(data || [])
  }

  async function carregaVarietats(id) {
    const { data } = await supabase.from('varietats').select('*').eq('cultiu_id', id).order('nom')
    setVarietats(data || [])
  }

  function iniciarEdicio(item, tipus) {
    setEditant({ item, tipus })
    setNomNou(item.nom || '')
    setColorNou(item.color || '#C0DD97')
    setPlurianualNou(item.plurianual || false)
  }

  function iniciarNou(tipus) {
    setEditant({ item: null, tipus })
    setNomNou(''); setColorNou('#C0DD97'); setPlurianualNou(false)
  }

  async function guardar() {
    if (!nomNou.trim()) return
    setGuardant(true)
    const { tipus, item } = editant
    if (tipus === 'cultiu') {
      const dades = { nom: nomNou, color: colorNou, plurianual: plurianualNou }
      if (item) await supabase.from('cultius').update(dades).eq('id', item.id)
      else await supabase.from('cultius').insert(dades)
      await carregaCultius()
    } else {
      const dades = { nom: nomNou, cultiu_id: cultiuSeleccionat.id }
      if (item) await supabase.from('varietats').update(dades).eq('id', item.id)
      else await supabase.from('varietats').insert(dades)
      await carregaVarietats(cultiuSeleccionat.id)
    }
    setEditant(null); setGuardant(false)
  }

  async function eliminar() {
    if (!editant?.item) return
    const taula = editant.tipus === 'cultiu' ? 'cultius' : 'varietats'
    await supabase.from(taula).delete().eq('id', editant.item.id)
    setEditant(null)
    if (editant.tipus === 'cultiu') { await carregaCultius(); setCultiuSeleccionat(null); setVarietats([]) }
    else await carregaVarietats(cultiuSeleccionat.id)
  }

  return (
    <div style={s.tresCol}>
      <div style={s.col}>
        <div style={s.colCap}>
          <div style={s.colTitol}>Cultius</div>
          <button style={s.botoNou} onClick={() => iniciarNou('cultiu')}>+</button>
        </div>
        <div style={s.llista}>
          {cultius.map(c => (
            <div key={c.id} style={{...s.item, ...(cultiuSeleccionat?.id===c.id?s.itemActiu:{})}}
              onClick={() => setCultiuSeleccionat(c)}>
              <div style={{width:'10px',height:'10px',borderRadius:'2px',background:c.color||'#ddd',flexShrink:0}}/>
              <span style={s.itemNom}>{c.nom}</span>
              <span style={s.itemTag}>{c.plurianual?'🌳':'🌱'}</span>
              <button style={s.botoEdit} onClick={e=>{e.stopPropagation();iniciarEdicio(c,'cultiu')}}>✏️</button>
            </div>
          ))}
        </div>
      </div>
      <div style={s.col}>
        <div style={s.colCap}>
          <div style={s.colTitol}>{cultiuSeleccionat?`Varietats de ${cultiuSeleccionat.nom}`:'Selecciona cultiu'}</div>
          {cultiuSeleccionat && <button style={s.botoNou} onClick={() => iniciarNou('varietat')}>+</button>}
        </div>
        <div style={s.llista}>
          {varietats.map(v => (
            <div key={v.id} style={s.item}>
              <span style={s.itemNom}>{v.nom}</span>
              <button style={s.botoEdit} onClick={() => iniciarEdicio(v,'varietat')}>✏️</button>
            </div>
          ))}
        </div>
      </div>
      <FormulariEdicio editant={editant} nomNou={nomNou} setNomNou={setNomNou}
        colorNou={colorNou} setColorNou={setColorNou}
        plurianualNou={plurianualNou} setPlurianualNou={setPlurianualNou}
        mostrarColor={editant?.tipus==='cultiu'}
        mostrarPluranual={editant?.tipus==='cultiu'}
        guardar={guardar} eliminar={eliminar} guardant={guardant}
        onCancel={() => setEditant(null)} COLORS={['#FAC775','#C0DD97','#9FE1CB','#F5C4B3','#F4C0D1','#B5D4F4','#D3D1C7','#F7C1C1','#EAF3DE','#D4B5F4','#FFE4B5','#98FB98']}/>
    </div>
  )
}

// ─── TASQUES ────────────────────────────────────────────────
function SeccioTasques() {
  const [tasques, setTasques] = useState([])
  const [subtasques, setSubtasques] = useState([])
  const [tascaSeleccionada, setTascaSeleccionada] = useState(null)
  const [editant, setEditant] = useState(null)
  const [nomNou, setNomNou] = useState('')
  const [unitatNou, setUnitatNou] = useState('')
  const [guardant, setGuardant] = useState(false)

  useEffect(() => { carregaTasques() }, [])
  useEffect(() => { if (tascaSeleccionada) carregaSubtasques(tascaSeleccionada.id) }, [tascaSeleccionada])

  async function carregaTasques() {
    const { data } = await supabase.from('tasques').select('*').order('nom')
    setTasques(data || [])
  }

  async function carregaSubtasques(id) {
    const { data } = await supabase.from('subtasques').select('*').eq('tasca_id', id).order('nom')
    setSubtasques(data || [])
  }

  function iniciarEdicio(item, tipus) {
    setEditant({ item, tipus })
    setNomNou(item.nom || '')
    setUnitatNou(item.unitat || '')
  }

  function iniciarNou(tipus) {
    setEditant({ item: null, tipus })
    setNomNou(''); setUnitatNou('')
  }

  async function guardar() {
    if (!nomNou.trim()) return
    setGuardant(true)
    const { tipus, item } = editant
    if (tipus === 'tasca') {
      const dades = { nom: nomNou, unitat: unitatNou || null }
      if (item) await supabase.from('tasques').update(dades).eq('id', item.id)
      else await supabase.from('tasques').insert(dades)
      await carregaTasques()
    } else {
      const dades = { nom: nomNou, tasca_id: tascaSeleccionada.id }
      if (item) await supabase.from('subtasques').update(dades).eq('id', item.id)
      else await supabase.from('subtasques').insert(dades)
      await carregaSubtasques(tascaSeleccionada.id)
    }
    setEditant(null); setGuardant(false)
  }

  async function eliminar() {
    if (!editant?.item) return
    const taula = editant.tipus === 'tasca' ? 'tasques' : 'subtasques'
    await supabase.from(taula).delete().eq('id', editant.item.id)
    setEditant(null)
    if (editant.tipus === 'tasca') { await carregaTasques(); setTascaSeleccionada(null); setSubtasques([]) }
    else await carregaSubtasques(tascaSeleccionada.id)
  }

  return (
    <div style={s.tresCol}>
      <div style={s.col}>
        <div style={s.colCap}>
          <div style={s.colTitol}>Tasques</div>
          <button style={s.botoNou} onClick={() => iniciarNou('tasca')}>+</button>
        </div>
        <div style={s.llista}>
          {tasques.map(t => (
            <div key={t.id} style={{...s.item, ...(tascaSeleccionada?.id===t.id?s.itemActiu:{})}}
              onClick={() => setTascaSeleccionada(t)}>
              <span style={s.itemNom}>{t.nom}</span>
              {t.unitat && <span style={s.itemTag}>{t.unitat}</span>}
              <button style={s.botoEdit} onClick={e=>{e.stopPropagation();iniciarEdicio(t,'tasca')}}>✏️</button>
            </div>
          ))}
        </div>
      </div>
      <div style={s.col}>
        <div style={s.colCap}>
          <div style={s.colTitol}>{tascaSeleccionada?`Subtasques de ${tascaSeleccionada.nom}`:'Selecciona tasca'}</div>
          {tascaSeleccionada && <button style={s.botoNou} onClick={() => iniciarNou('subtasca')}>+</button>}
        </div>
        <div style={s.llista}>
          {subtasques.map(st => (
            <div key={st.id} style={s.item}>
              <span style={s.itemNom}>{st.nom}</span>
              <button style={s.botoEdit} onClick={() => iniciarEdicio(st,'subtasca')}>✏️</button>
            </div>
          ))}
        </div>
      </div>
      <div style={s.col}>
        {editant ? (
          <div style={{padding:'12px'}}>
            <div style={s.colTitol}>{editant.item?'Editar':'Nou'} {editant.tipus}</div>
            <div style={s.grup}>
              <label style={s.label}>Nom</label>
              <input style={s.input} value={nomNou} onChange={e=>setNomNou(e.target.value)} autoFocus/>
            </div>
            {editant.tipus === 'tasca' && (
              <div style={s.grup}>
                <label style={s.label}>Unitat (opcional)</label>
                <input style={s.input} value={unitatNou} onChange={e=>setUnitatNou(e.target.value)} placeholder="kg, litres..."/>
              </div>
            )}
            <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
              <button style={s.botoPrimari} onClick={guardar} disabled={guardant}>{guardant?'...':'Guardar'}</button>
              <button style={s.botoCancel} onClick={() => setEditant(null)}>Cancel·lar</button>
            </div>
            {editant.item && <button style={s.botoEliminar} onClick={eliminar}>Eliminar</button>}
          </div>
        ) : <div style={{padding:'12px',color:'#aaa',fontSize:'13px'}}>Clica ✏️ per editar o + per afegir</div>}
      </div>
    </div>
  )
}

// ─── TIPUS ZONES ────────────────────────────────────────────
function SeccioTipusZones() {
  const [tipusZones, setTipusZones] = useState([])
  const [editant, setEditant] = useState(null)
  const [nomNou, setNomNou] = useState('')
  const [colorNou, setColorNou] = useState('#C0DD97')
  const [esPermanentNou, setEsPermanentNou] = useState(false)
  const [guardant, setGuardant] = useState(false)

  const COLORS = ['#FAC775','#C0DD97','#9FE1CB','#F5C4B3','#F4C0D1','#B5D4F4','#D3D1C7','#F7C1C1','#EAF3DE','#D4B5F4']

  useEffect(() => { carregaTipus() }, [])

  async function carregaTipus() {
    const { data } = await supabase.from('tipus_de_zona').select('*').order('ordre')
    setTipusZones(data || [])
  }

  function iniciarEdicio(item) {
    setEditant(item)
    setNomNou(item.nom)
    setColorNou(item.color_defecte || '#C0DD97')
    setEsPermanentNou(item.es_permanent || false)
  }

  async function guardar() {
    if (!nomNou.trim()) return
    setGuardant(true)
    const dades = { nom: nomNou, color_defecte: colorNou, es_permanent: esPermanentNou }
    if (editant?.id) await supabase.from('tipus_de_zona').update(dades).eq('id', editant.id)
    else await supabase.from('tipus_de_zona').insert({ ...dades, ordre: tipusZones.length + 1 })
    await carregaTipus()
    setEditant(null); setGuardant(false)
  }

  async function eliminar() {
    if (!editant?.id) return
    await supabase.from('tipus_de_zona').delete().eq('id', editant.id)
    await carregaTipus()
    setEditant(null)
  }

  return (
    <div style={s.tresCol}>
      <div style={{...s.col, gridColumn:'span 2'}}>
        <div style={s.colCap}>
          <div style={s.colTitol}>Tipus de zones</div>
          <button style={s.botoNou} onClick={() => { setEditant({}); setNomNou(''); setColorNou('#C0DD97'); setEsPermanentNou(false) }}>+</button>
        </div>
        <div style={s.llista}>
          {tipusZones.map(t => (
            <div key={t.id} style={s.item}>
              <div style={{width:'14px',height:'14px',borderRadius:'3px',background:t.color_defecte||'#ddd',flexShrink:0}}/>
              <span style={s.itemNom}>{t.nom}</span>
              <span style={s.itemTag}>{t.es_permanent?'permanent':'cultiu'}</span>
              <button style={s.botoEdit} onClick={() => iniciarEdicio(t)}>✏️</button>
            </div>
          ))}
        </div>
      </div>
      <div style={s.col}>
        {editant !== null ? (
          <div style={{padding:'12px'}}>
            <div style={s.colTitol}>{editant.id?'Editar':'Nou'} tipus</div>
            <div style={s.grup}>
              <label style={s.label}>Nom</label>
              <input style={s.input} value={nomNou} onChange={e=>setNomNou(e.target.value)} autoFocus/>
            </div>
            <div style={s.grup}>
              <label style={s.label}>Color per defecte</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setColorNou(c)}
                    style={{width:'22px',height:'22px',borderRadius:'4px',background:c,
                      border:colorNou===c?'2.5px solid #1D9E75':'1px solid rgba(0,0,0,0.15)',cursor:'pointer'}}/>
                ))}
              </div>
            </div>
            <div style={s.grup}>
              <label style={s.label}>
                <input type="checkbox" checked={esPermanentNou}
                  onChange={e=>setEsPermanentNou(e.target.checked)} style={{marginRight:'6px'}}/>
                És zona permanent
              </label>
            </div>
            <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
              <button style={s.botoPrimari} onClick={guardar} disabled={guardant}>{guardant?'...':'Guardar'}</button>
              <button style={s.botoCancel} onClick={() => setEditant(null)}>Cancel·lar</button>
            </div>
            {editant.id && <button style={s.botoEliminar} onClick={eliminar}>Eliminar</button>}
          </div>
        ) : <div style={{padding:'12px',color:'#aaa',fontSize:'13px'}}>Clica ✏️ per editar o + per afegir</div>}
      </div>
    </div>
  )
}

// ─── POBLES I CAMPS ─────────────────────────────────────────
function SeccioCamps({ onActualitzar }) {
  const [pobles, setPobles] = useState([])
  const [camps, setCamps] = useState([])
  const [pobleSeleccionat, setPobleSeleccionat] = useState(null)
  const [editant, setEditant] = useState(null)
  const [nomNou, setNomNou] = useState('')
  const [guardant, setGuardant] = useState(false)

  useEffect(() => { carregaPobles() }, [])
  useEffect(() => { if (pobleSeleccionat) carregaCamps(pobleSeleccionat.id) }, [pobleSeleccionat])

  async function carregaPobles() {
    const { data } = await supabase.from('pobles').select('*').order('nom')
    setPobles(data || [])
  }

  async function carregaCamps(id) {
    const { data } = await supabase.from('camps').select('*').eq('poble_id', id).order('nom')
    setCamps(data || [])
  }

  async function guardar() {
    if (!nomNou.trim()) return
    setGuardant(true)
    const { tipus, item } = editant
    if (tipus === 'poble') {
      if (item) await supabase.from('pobles').update({ nom: nomNou }).eq('id', item.id)
      else await supabase.from('pobles').insert({ nom: nomNou })
      await carregaPobles()
    } else {
      if (item) await supabase.from('camps').update({ nom: nomNou }).eq('id', item.id)
      else await supabase.from('camps').insert({ nom: nomNou, poble_id: pobleSeleccionat.id })
      await carregaCamps(pobleSeleccionat.id)
    }
    setEditant(null); setGuardant(false)
    onActualitzar && onActualitzar()
  }

  async function eliminar() {
    if (!editant?.item) return
    const taula = editant.tipus === 'poble' ? 'pobles' : 'camps'
    await supabase.from(taula).delete().eq('id', editant.item.id)
    setEditant(null)
    if (editant.tipus === 'poble') { await carregaPobles(); setPobleSeleccionat(null); setCamps([]) }
    else await carregaCamps(pobleSeleccionat.id)
    onActualitzar && onActualitzar()
  }

  return (
    <div style={s.tresCol}>
      <div style={s.col}>
        <div style={s.colCap}>
          <div style={s.colTitol}>Pobles</div>
          <button style={s.botoNou} onClick={() => { setEditant({item:null,tipus:'poble'}); setNomNou('') }}>+</button>
        </div>
        <div style={s.llista}>
          {pobles.map(p => (
            <div key={p.id} style={{...s.item, ...(pobleSeleccionat?.id===p.id?s.itemActiu:{})}}
              onClick={() => setPobleSeleccionat(p)}>
              <span style={s.itemNom}>📍 {p.nom}</span>
              <button style={s.botoEdit} onClick={e=>{e.stopPropagation();setEditant({item:p,tipus:'poble'});setNomNou(p.nom)}}>✏️</button>
            </div>
          ))}
        </div>
      </div>
      <div style={s.col}>
        <div style={s.colCap}>
          <div style={s.colTitol}>{pobleSeleccionat?`Camps de ${pobleSeleccionat.nom}`:'Selecciona poble'}</div>
          {pobleSeleccionat && <button style={s.botoNou} onClick={() => { setEditant({item:null,tipus:'camp'}); setNomNou('') }}>+</button>}
        </div>
        <div style={s.llista}>
          {camps.map(c => (
            <div key={c.id} style={s.item}>
              <span style={s.itemNom}>🌱 {c.nom}</span>
              <button style={s.botoEdit} onClick={() => { setEditant({item:c,tipus:'camp'}); setNomNou(c.nom) }}>✏️</button>
            </div>
          ))}
        </div>
      </div>
      <div style={s.col}>
        {editant ? (
          <div style={{padding:'12px'}}>
            <div style={s.colTitol}>{editant.item?'Editar':'Nou'} {editant.tipus==='poble'?'poble':'camp'}</div>
            <div style={s.grup}>
              <label style={s.label}>Nom</label>
              <input style={s.input} value={nomNou} onChange={e=>setNomNou(e.target.value)} autoFocus
                onKeyDown={e=>e.key==='Enter'&&guardar()}/>
            </div>
            <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
              <button style={s.botoPrimari} onClick={guardar} disabled={guardant}>{guardant?'...':'Guardar'}</button>
              <button style={s.botoCancel} onClick={() => setEditant(null)}>Cancel·lar</button>
            </div>
            {editant.item && <button style={s.botoEliminar} onClick={eliminar}>⚠️ Eliminar</button>}
          </div>
        ) : <div style={{padding:'12px',color:'#aaa',fontSize:'13px'}}>Clica ✏️ per editar o + per afegir</div>}
      </div>
    </div>
  )
}

// ─── COMPONENT REUTILITZABLE ────────────────────────────────
function FormulariEdicio({ editant, nomNou, setNomNou, colorNou, setColorNou, plurianualNou, setPlurianualNou, mostrarColor, mostrarPluranual, guardar, eliminar, guardant, onCancel, COLORS }) {
  if (!editant) return <div style={{padding:'12px',color:'#aaa',fontSize:'13px'}}>Clica ✏️ per editar o + per afegir</div>
  return (
    <div style={{padding:'12px'}}>
      <div style={s.colTitol}>{editant.item?'Editar':'Nou'} {editant.tipus}</div>
      <div style={s.grup}>
        <label style={s.label}>Nom</label>
        <input style={s.input} value={nomNou} onChange={e=>setNomNou(e.target.value)} autoFocus/>
      </div>
      {mostrarColor && (
        <div style={s.grup}>
          <label style={s.label}>Color</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:'4px', marginBottom:'6px'}}>
            {COLORS.map(c => (
              <div key={c} onClick={() => setColorNou(c)}
                style={{width:'22px',height:'22px',borderRadius:'4px',background:c,
                  border:colorNou===c?'2.5px solid #1D9E75':'1px solid rgba(0,0,0,0.15)',cursor:'pointer'}}/>
            ))}
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
            <input type="color" value={colorNou || '#C0DD97'}
              onChange={e => setColorNou(e.target.value)}
              style={{width:'32px', height:'32px', padding:'0', border:'1px solid #ddd', borderRadius:'4px', cursor:'pointer'}}/>
            <span style={{fontSize:'11px', color:'#888'}}>O tria color lliure</span>
          </div>
        </div>
      )}
      {mostrarPluranual && (
        <div style={s.grup}>
          <label style={s.label}>
            <input type="checkbox" checked={plurianualNou} onChange={e=>setPlurianualNou(e.target.checked)} style={{marginRight:'6px'}}/>
            Plurianual (arbre, maduixera...)
          </label>
        </div>
      )}
      <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
        <button style={s.botoPrimari} onClick={guardar} disabled={guardant}>{guardant?'...':'Guardar'}</button>
        <button style={s.botoCancel} onClick={onCancel}>Cancel·lar</button>
      </div>
      {editant.item && <button style={s.botoEliminar} onClick={eliminar}>Eliminar</button>}
    </div>
  )
}

// ─── STYLES ─────────────────────────────────────────────────
const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(900px, 97vw)', height:'85vh', display:'flex', flexDirection:'column' },
  cap: { padding:'14px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  titol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999' },
  tabs: { display:'flex', gap:'4px', padding:'10px 16px', borderBottom:'1px solid #eee', flexShrink:0, flexWrap:'wrap' },
  tab: { padding:'7px 14px', border:'1px solid #ddd', borderRadius:'20px', cursor:'pointer', background:'white', color:'#666', fontSize:'13px' },
  tabActiu: { background:'#1D9E75', color:'white', borderColor:'#1D9E75', fontWeight:'500' },
  cos: { flex:1, overflow:'hidden', padding:'16px' },
}

const s = {
  tresCol: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px', height:'100%' },
  col: { display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid #eee', borderRadius:'8px' },
  colCap: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderBottom:'1px solid #eee', flexShrink:0 },
  colTitol: { fontSize:'13px', fontWeight:'600', color:'#333' },
  botoNou: { width:'24px', height:'24px', background:'#1D9E75', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' },
  llista: { flex:1, overflowY:'auto', padding:'6px' },
  item: { display:'flex', alignItems:'center', gap:'6px', padding:'7px 8px', borderRadius:'6px', cursor:'pointer', marginBottom:'2px' },
  itemActiu: { background:'#E1F5EE' },
  itemNom: { flex:1, fontSize:'13px', color:'#333' },
  itemTag: { fontSize:'11px', color:'#aaa' },
  botoEdit: { background:'none', border:'none', cursor:'pointer', fontSize:'13px', opacity:0.5 },
  grup: { marginBottom:'10px' },
  label: { display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' },
  input: { width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' },
  botoPrimari: { padding:'8px 16px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'500' },
  botoCancel: { padding:'8px 16px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
  botoEliminar: { width:'100%', padding:'8px', background:'white', color:'#e55', border:'1px solid #e55', borderRadius:'8px', cursor:'pointer', fontSize:'13px', marginTop:'8px' },
}
