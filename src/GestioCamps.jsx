import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function GestioCamps({ onTancar, onActualitzar }) {
  const [pobles, setPobles] = useState([])
  const [camps, setCamps] = useState([])
  const [pobleSeleccionat, setPobleSeleccionat] = useState(null)
  const [editant, setEditant] = useState(null)
  const [nomNou, setNomNou] = useState('')
  const [guardant, setGuardant] = useState(false)

  useEffect(() => { carregaDades() }, [])
  useEffect(() => {
    if (pobleSeleccionat) carregaCamps(pobleSeleccionat.id)
  }, [pobleSeleccionat])

  async function carregaDades() {
    const { data } = await supabase.from('pobles').select('*').order('nom')
    setPobles(data || [])
  }

  async function carregaCamps(pobleId) {
    const { data } = await supabase.from('camps').select('*').eq('poble_id', pobleId).order('nom')
    setCamps(data || [])
  }

  function iniciarEdicio(item, tipus) {
    setEditant({ item, tipus })
    setNomNou(item.nom || '')
  }

  function iniciarNou(tipus) {
    setEditant({ item: null, tipus })
    setNomNou('')
  }

  async function guardar() {
    if (!nomNou.trim()) return
    setGuardant(true)
    const { tipus, item } = editant

    if (tipus === 'poble') {
      if (item) {
        await supabase.from('pobles').update({ nom: nomNou }).eq('id', item.id)
      } else {
        await supabase.from('pobles').insert({ nom: nomNou })
      }
      await carregaDades()
    } else if (tipus === 'camp') {
      if (item) {
        await supabase.from('camps').update({ nom: nomNou }).eq('id', item.id)
      } else {
        await supabase.from('camps').insert({ nom: nomNou, poble_id: pobleSeleccionat.id })
      }
      await carregaCamps(pobleSeleccionat.id)
    }

    setEditant(null)
    setGuardant(false)
    onActualitzar && onActualitzar()
  }

  async function eliminar() {
    if (!editant?.item) return
    const { tipus, item } = editant
    if (tipus === 'poble') {
      await supabase.from('pobles').delete().eq('id', item.id)
      setPobleSeleccionat(null)
      setCamps([])
      await carregaDades()
    } else if (tipus === 'camp') {
      await supabase.from('camps').delete().eq('id', item.id)
      await carregaCamps(pobleSeleccionat.id)
    }
    setEditant(null)
    onActualitzar && onActualitzar()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={styles.titol}>Gestió de pobles i camps</div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

        <div style={styles.cos}>
          <div style={styles.tresColumnes}>
            {/* Pobles */}
            <div style={styles.columna}>
              <div style={styles.columnaHeader}>
                <div style={styles.columnaTitol}>Pobles</div>
                <button style={styles.botoNou} onClick={() => iniciarNou('poble')}>+</button>
              </div>
              <div style={styles.llista}>
                {pobles.map(p => (
                  <div key={p.id}
                    style={{...styles.item, ...(pobleSeleccionat?.id===p.id?styles.itemActiu:{})}}
                    onClick={() => setPobleSeleccionat(p)}>
                    <span style={styles.itemNom}>📍 {p.nom}</span>
                    <button style={styles.botoEdit}
                      onClick={e => { e.stopPropagation(); iniciarEdicio(p,'poble') }}>✏️</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Camps */}
            <div style={styles.columna}>
              <div style={styles.columnaHeader}>
                <div style={styles.columnaTitol}>
                  {pobleSeleccionat ? `Camps de ${pobleSeleccionat.nom}` : 'Selecciona un poble'}
                </div>
                {pobleSeleccionat && (
                  <button style={styles.botoNou} onClick={() => iniciarNou('camp')}>+</button>
                )}
              </div>
              <div style={styles.llista}>
                {camps.map(c => (
                  <div key={c.id} style={styles.item}>
                    <span style={styles.itemNom}>🌱 {c.nom}</span>
                    <button style={styles.botoEdit} onClick={() => iniciarEdicio(c,'camp')}>✏️</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulari */}
            <div style={styles.columna}>
              {editant ? (
                <div style={{padding:'16px'}}>
                  <div style={styles.columnaTitol}>
                    {editant.item ? 'Editar' : 'Nou'} {editant.tipus === 'poble' ? 'poble' : 'camp'}
                  </div>
                  <div style={styles.grup}>
                    <label style={styles.label}>Nom</label>
                    <input style={styles.input} value={nomNou}
                      onChange={e => setNomNou(e.target.value)}
                      placeholder="Nom..." autoFocus
                      onKeyDown={e => e.key === 'Enter' && guardar()}/>
                  </div>
                  {editant.tipus === 'camp' && editant.item && (
                    <div style={styles.infoBox}>
                      <div style={styles.infoTitol}>Zones</div>
                      <div style={styles.infoText}>
                        Per editar les zones d'aquest camp, utilitza l'editor de zones des del mapa.
                      </div>
                    </div>
                  )}
                  <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
                    <button style={styles.botoPrimari} onClick={guardar} disabled={guardant}>
                      {guardant ? '...' : 'Guardar'}
                    </button>
                    <button style={styles.botoCancel} onClick={() => setEditant(null)}>
                      Cancel·lar
                    </button>
                  </div>
                  {editant.item && (
                    <button style={styles.botoEliminar} onClick={eliminar}>
                      ⚠️ Eliminar {editant.tipus === 'poble' ? 'poble' : 'camp'}
                    </button>
                  )}
                  {editant.item && editant.tipus === 'poble' && (
                    <div style={styles.avis}>
                      Eliminar un poble eliminarà tots els seus camps associats.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{padding:'16px', color:'#aaa', fontSize:'13px'}}>
                  Clica ✏️ per editar o + per afegir
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(800px, 97vw)', height:'75vh', display:'flex', flexDirection:'column' },
  cap: { padding:'14px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  titol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999' },
  cos: { flex:1, overflow:'hidden', padding:'16px' },
  tresColumnes: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px', height:'100%' },
  columna: { display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid #eee', borderRadius:'8px' },
  columnaHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderBottom:'1px solid #eee', flexShrink:0 },
  columnaTitol: { fontSize:'13px', fontWeight:'600', color:'#333' },
  botoNou: { width:'24px', height:'24px', background:'#1D9E75', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' },
  llista: { flex:1, overflowY:'auto', padding:'6px' },
  item: { display:'flex', alignItems:'center', gap:'6px', padding:'8px', borderRadius:'6px', cursor:'pointer', marginBottom:'2px' },
  itemActiu: { background:'#E1F5EE' },
  itemNom: { flex:1, fontSize:'13px', color:'#333' },
  botoEdit: { background:'none', border:'none', cursor:'pointer', fontSize:'13px', opacity:0.5 },
  grup: { marginBottom:'12px' },
  label: { display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' },
  input: { width:'100%', padding:'8px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' },
  botoPrimari: { padding:'8px 16px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'500' },
  botoCancel: { padding:'8px 16px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
  botoEliminar: { width:'100%', padding:'8px', background:'white', color:'#e55', border:'1px solid #e55', borderRadius:'8px', cursor:'pointer', fontSize:'13px', marginTop:'8px' },
  infoBox: { background:'#f8f7f4', border:'1px solid #eee', borderRadius:'8px', padding:'10px', marginTop:'12px' },
  infoTitol: { fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' },
  infoText: { fontSize:'12px', color:'#888' },
  avis: { fontSize:'11px', color:'#e55', marginTop:'8px' },
}
