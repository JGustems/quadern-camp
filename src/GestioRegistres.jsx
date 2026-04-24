import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function GestioRegistres({ onTancar }) {
  const [registres, setRegistres] = useState([])
  const [camps, setCamps] = useState([])
  const [tasques, setTasques] = useState([])
  const [cultius, setCultius] = useState([])
  const [varietats, setVarietats] = useState([])
  const [subtasques, setSubtasques] = useState([])
  const [usuaris, setUsuaris] = useState([])
  const [carregant, setCarregant] = useState(true)
  const [editant, setEditant] = useState(null)
  const [guardant, setGuardant] = useState(false)
  const [filtre, setFiltre] = useState({ camp: '', data: '', tasca: '' })
  const [pagina, setPagina] = useState(0)
  const PER_PAGINA = 20

  useEffect(() => { carregaDades() }, [])
  useEffect(() => { if (editant?.tasca_id) carregaSubtasques(editant.tasca_id) }, [editant?.tasca_id])
  useEffect(() => { if (editant?.cultiu_id) carregaVarietats(editant.cultiu_id) }, [editant?.cultiu_id])

  async function carregaDades() {
    setCarregant(true)
    const [r, c, t, cu, u] = await Promise.all([
      supabase.from('registres').select(`
        *,
        zones(codi, camp_id, camps(nom, pobles(nom))),
        cultius(nom), varietats(nom), tasques(nom), subtasques(nom), usuaris(nom)
      `).order('data', { ascending: false }).limit(200),
      supabase.from('camps').select('id, nom, pobles(nom)').order('nom'),
      supabase.from('tasques').select('*').order('nom'),
      supabase.from('cultius').select('*').order('nom'),
      supabase.from('usuaris').select('*').order('nom'),
    ])
    setRegistres(r.data || [])
    setCamps(c.data || [])
    setTasques(t.data || [])
    setCultius(cu.data || [])
    setUsuaris(u.data || [])
    setCarregant(false)
  }

  async function carregaSubtasques(tascaId) {
    const { data } = await supabase.from('subtasques').select('*').eq('tasca_id', tascaId).order('nom')
    setSubtasques(data || [])
  }

  async function carregaVarietats(cultiuId) {
    const { data } = await supabase.from('varietats').select('*').eq('cultiu_id', cultiuId).order('nom')
    setVarietats(data || [])
  }

  function iniciarEdicio(r) {
    setEditant({
      id: r.id,
      zona_id: r.zona_id,
      cultiu_id: r.cultiu_id,
      varietat_id: r.varietat_id,
      tasca_id: r.tasca_id,
      subtasca_id: r.subtasca_id,
      usuari_id: r.usuari_id,
      data: r.data,
      quantitat: r.quantitat || '',
      unitat: r.unitat || '',
      cost_ma_obra: r.cost_ma_obra || '',
      cost_producte: r.cost_producte || '',
      nom_producte: r.nom_producte || '',
      notes: r.notes || '',
      // Info de visualització
      zona_codi: r.zones?.codi,
      camp_nom: r.zones?.camps?.nom,
      poble_nom: r.zones?.camps?.pobles?.nom,
    })
  }

  async function guardar() {
    if (!editant) return
    setGuardant(true)
    await supabase.from('registres').update({
      cultiu_id: editant.cultiu_id || null,
      varietat_id: editant.varietat_id || null,
      tasca_id: editant.tasca_id || null,
      subtasca_id: editant.subtasca_id || null,
      usuari_id: editant.usuari_id || null,
      data: editant.data,
      quantitat: editant.quantitat ? parseFloat(editant.quantitat) : null,
      unitat: editant.unitat || null,
      cost_ma_obra: editant.cost_ma_obra ? parseFloat(editant.cost_ma_obra) : null,
      cost_producte: editant.cost_producte ? parseFloat(editant.cost_producte) : null,
      nom_producte: editant.nom_producte || null,
      notes: editant.notes || null,
    }).eq('id', editant.id)
    await carregaDades()
    setEditant(null)
    setGuardant(false)
  }

  async function eliminar(id) {
    if (!window.confirm('Eliminar aquest registre?')) return
    await supabase.from('registres').delete().eq('id', id)
    await carregaDades()
    if (editant?.id === id) setEditant(null)
  }

  function formatData(data) {
    return new Date(data).toLocaleDateString('ca-ES', { day:'numeric', month:'short', year:'numeric' })
  }

  const registresFiltrats = registres.filter(r => {
    if (filtre.camp && r.zones?.camps?.nom !== filtre.camp) return false
    if (filtre.tasca && r.tasques?.nom !== filtre.tasca) return false
    if (filtre.data && !r.data?.startsWith(filtre.data)) return false
    return true
  })

  const registresPagina = registresFiltrats.slice(pagina*PER_PAGINA, (pagina+1)*PER_PAGINA)
  const totalPagines = Math.ceil(registresFiltrats.length / PER_PAGINA)

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={styles.titol}>📋 Gestió de registres</div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

        {/* Filtres */}
        <div style={styles.filtres}>
          <select style={styles.filtre} value={filtre.camp}
            onChange={e => { setFiltre(f=>({...f,camp:e.target.value})); setPagina(0) }}>
            <option value="">Tots els camps</option>
            {camps.map(c => <option key={c.id} value={c.nom}>{c.pobles?.nom} · {c.nom}</option>)}
          </select>
          <select style={styles.filtre} value={filtre.tasca}
            onChange={e => { setFiltre(f=>({...f,tasca:e.target.value})); setPagina(0) }}>
            <option value="">Totes les tasques</option>
            {tasques.map(t => <option key={t.id} value={t.nom}>{t.nom}</option>)}
          </select>
          <input type="month" style={styles.filtre} value={filtre.data}
            onChange={e => { setFiltre(f=>({...f,data:e.target.value})); setPagina(0) }}/>
          <span style={{fontSize:'12px', color:'#888'}}>
            {registresFiltrats.length} registres
          </span>
        </div>

        <div style={styles.cos}>
          {/* Llista */}
          <div style={styles.llista}>
            {carregant ? (
              <div style={styles.centrat}>Carregant...</div>
            ) : registresPagina.length === 0 ? (
              <div style={styles.centrat}>No hi ha registres</div>
            ) : (
              registresPagina.map(r => (
                <div key={r.id}
                  style={{...styles.registre, ...(editant?.id===r.id?styles.registreActiu:{})}}
                  onClick={() => iniciarEdicio(r)}>
                  <div style={styles.registreData}>{formatData(r.data)}</div>
                  <div style={styles.registreCos}>
                    <div style={styles.registreTitol}>
                      {r.tasques?.nom}
                      {r.subtasques?.nom && <span style={styles.sub}> · {r.subtasques.nom}</span>}
                    </div>
                    <div style={styles.registreInfo}>
                      {r.zones?.camps?.pobles?.nom} · {r.zones?.camps?.nom} · Zona {r.zones?.codi}
                      {r.cultius?.nom && ` · ${r.cultius.nom}`}
                      {r.varietats?.nom && r.varietats.nom !== '-' && ` (${r.varietats.nom})`}
                    </div>
                    {r.notes && <div style={styles.registreNotes}>{r.notes}</div>}
                  </div>
                  <button style={styles.botoEliminar}
                    onClick={e => { e.stopPropagation(); eliminar(r.id) }}>🗑</button>
                </div>
              ))
            )}
            {totalPagines > 1 && (
              <div style={styles.paginacio}>
                <button style={styles.botoPag} disabled={pagina===0} onClick={() => setPagina(p=>p-1)}>←</button>
                <span style={{fontSize:'13px', color:'#666'}}>{pagina+1} / {totalPagines}</span>
                <button style={styles.botoPag} disabled={pagina>=totalPagines-1} onClick={() => setPagina(p=>p+1)}>→</button>
              </div>
            )}
          </div>

          {/* Formulari edició */}
          {editant && (
            <div style={styles.formulari}>
              <div style={styles.formTitol}>
                Editant registre
                <span style={{fontSize:'12px', color:'#888', fontWeight:'400', marginLeft:'8px'}}>
                  {editant.poble_nom} · {editant.camp_nom} · Zona {editant.zona_codi}
                </span>
              </div>

              <div style={styles.grup}>
                <label style={styles.label}>Data</label>
                <input type="date" style={styles.input} value={editant.data||''}
                  onChange={e => setEditant(prev=>({...prev, data:e.target.value}))}/>
              </div>

              <div style={styles.grup}>
                <label style={styles.label}>Tasca</label>
                <select style={styles.input} value={editant.tasca_id||''}
                  onChange={e => setEditant(prev=>({...prev, tasca_id:parseInt(e.target.value)||null, subtasca_id:null}))}>
                  <option value="">— cap —</option>
                  {tasques.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                </select>
              </div>

              {subtasques.length > 0 && (
                <div style={styles.grup}>
                  <label style={styles.label}>Subtasca</label>
                  <select style={styles.input} value={editant.subtasca_id||''}
                    onChange={e => setEditant(prev=>({...prev, subtasca_id:parseInt(e.target.value)||null}))}>
                    <option value="">— cap —</option>
                    {subtasques.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>
              )}

              <div style={styles.grup}>
                <label style={styles.label}>Cultiu</label>
                <select style={styles.input} value={editant.cultiu_id||''}
                  onChange={e => setEditant(prev=>({...prev, cultiu_id:parseInt(e.target.value)||null, varietat_id:null}))}>
                  <option value="">— cap —</option>
                  {cultius.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>

              {varietats.length > 0 && (
                <div style={styles.grup}>
                  <label style={styles.label}>Varietat</label>
                  <select style={styles.input} value={editant.varietat_id||''}
                    onChange={e => setEditant(prev=>({...prev, varietat_id:parseInt(e.target.value)||null}))}>
                    <option value="">— cap —</option>
                    {varietats.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                  </select>
                </div>
              )}

              <div style={styles.grup}>
                <label style={styles.label}>Qui ho fa</label>
                <select style={styles.input} value={editant.usuari_id||''}
                  onChange={e => setEditant(prev=>({...prev, usuari_id:parseInt(e.target.value)||null}))}>
                  <option value="">— cap —</option>
                  {usuaris.map(u => <option key={u.id} value={u.id}>{u.nom}</option>)}
                </select>
              </div>

              <div style={styles.fila2}>
                <div style={styles.grup}>
                  <label style={styles.label}>Quantitat</label>
                  <input type="number" style={styles.input} value={editant.quantitat}
                    onChange={e => setEditant(prev=>({...prev, quantitat:e.target.value}))}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Unitat</label>
                  <input type="text" style={styles.input} value={editant.unitat}
                    onChange={e => setEditant(prev=>({...prev, unitat:e.target.value}))}/>
                </div>
              </div>

              <div style={styles.fila2}>
                <div style={styles.grup}>
                  <label style={styles.label}>Cost mà d'obra (€)</label>
                  <input type="number" style={styles.input} value={editant.cost_ma_obra}
                    onChange={e => setEditant(prev=>({...prev, cost_ma_obra:e.target.value}))}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Cost producte (€)</label>
                  <input type="number" style={styles.input} value={editant.cost_producte}
                    onChange={e => setEditant(prev=>({...prev, cost_producte:e.target.value}))}/>
                </div>
              </div>

              <div style={styles.grup}>
                <label style={styles.label}>Nom producte</label>
                <input type="text" style={styles.input} value={editant.nom_producte}
                  onChange={e => setEditant(prev=>({...prev, nom_producte:e.target.value}))}/>
              </div>

              <div style={styles.grup}>
                <label style={styles.label}>Notes</label>
                <textarea style={{...styles.input, height:'60px', resize:'vertical'}}
                  value={editant.notes}
                  onChange={e => setEditant(prev=>({...prev, notes:e.target.value}))}/>
              </div>

              <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
                <button style={styles.botoPrimari} onClick={guardar} disabled={guardant}>
                  {guardant ? 'Guardant...' : 'Guardar'}
                </button>
                <button style={styles.botoCancel} onClick={() => setEditant(null)}>
                  Cancel·lar
                </button>
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
  modal: { background:'white', borderRadius:'12px', width:'min(950px, 97vw)', height:'88vh', display:'flex', flexDirection:'column' },
  cap: { padding:'14px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  titol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999' },
  filtres: { display:'flex', gap:'8px', padding:'10px 16px', borderBottom:'1px solid #eee', flexShrink:0, flexWrap:'wrap', alignItems:'center' },
  filtre: { padding:'6px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', color:'#333' },
  cos: { flex:1, display:'flex', overflow:'hidden' },
  llista: { flex:1, overflowY:'auto', padding:'8px' },
  registre: { display:'flex', gap:'10px', padding:'10px', borderRadius:'8px', cursor:'pointer', marginBottom:'4px', border:'1px solid #eee' },
  registreActiu: { background:'#E1F5EE', borderColor:'#1D9E75' },
  registreData: { fontSize:'12px', color:'#888', flexShrink:0, width:'80px', paddingTop:'2px' },
  registreCos: { flex:1 },
  registreTitol: { fontSize:'13px', fontWeight:'600', color:'#333', marginBottom:'2px' },
  registreInfo: { fontSize:'12px', color:'#666' },
  registreNotes: { fontSize:'11px', color:'#aaa', marginTop:'2px', fontStyle:'italic' },
  sub: { fontWeight:'400', color:'#888' },
  botoEliminar: { background:'none', border:'none', cursor:'pointer', fontSize:'14px', opacity:0.4, flexShrink:0 },
  paginacio: { display:'flex', gap:'12px', justifyContent:'center', alignItems:'center', padding:'12px' },
  botoPag: { padding:'6px 12px', border:'1px solid #ddd', borderRadius:'6px', cursor:'pointer', background:'white', fontSize:'13px' },
  formulari: { width:'300px', borderLeft:'1px solid #eee', padding:'16px', overflowY:'auto', flexShrink:0 },
  formTitol: { fontSize:'14px', fontWeight:'600', color:'#333', marginBottom:'14px' },
  grup: { marginBottom:'10px' },
  label: { display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' },
  input: { width:'100%', padding:'7px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' },
  fila2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' },
  botoPrimari: { flex:1, padding:'9px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'500' },
  botoCancel: { padding:'9px 16px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
  centrat: { textAlign:'center', color:'#aaa', padding:'40px', fontSize:'14px' },
}
