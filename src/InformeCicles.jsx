import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const ICONS_TEMPS = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',80:'🌦️',95:'⛈️'}
const FASES_LLUNA = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘']

export default function InformeCicles({ onTancar }) {
  const [cultius, setCultius] = useState([])
  const [varietats, setVarietats] = useState([])
  const [cultiuSeleccionat, setCultiuSeleccionat] = useState(null)
  const [varietatSeleccionada, setVarietatSeleccionada] = useState(null)
  const [cicles, setCicles] = useState([])
  const [carregant, setCarregant] = useState(false)
  const [expandit, setExpandit] = useState(null)

  useEffect(() => { carregaCultius() }, [])
  useEffect(() => { if (cultiuSeleccionat) carregaVarietats(cultiuSeleccionat.id) }, [cultiuSeleccionat])
  useEffect(() => { if (cultiuSeleccionat) carregaCicles() }, [cultiuSeleccionat, varietatSeleccionada])

  async function carregaCultius() {
    const { data } = await supabase.from('cultius').select('*').order('nom')
    setCultius(data || [])
  }

  async function carregaVarietats(cultiuId) {
    const { data } = await supabase.from('varietats').select('*').eq('cultiu_id', cultiuId).order('nom')
    setVarietats(data || [])
    setVarietatSeleccionada(null)
  }

  async function carregaCicles() {
    if (!cultiuSeleccionat) return
    setCarregant(true)

    // 1. Agafar totes les plantacions del cultiu
    let queryPlantacions = supabase
      .from('registres')
      .select(`
        id, data, notes, lluna, temp_max, temp_min, codi_temps, pluja_setmana,
        tasques(nom), zones(id, codi, camp_id, camps(nom, pobles(nom))), varietats(id, nom)
      `)
      .eq('cultiu_id', cultiuSeleccionat.id)
      .in('tasques.nom', ['Plantar', 'Sembrar', 'Zona permanent'])
      .order('data', { ascending: true })

    if (varietatSeleccionada) {
      queryPlantacions = queryPlantacions.eq('varietat_id', varietatSeleccionada.id)
    }

    const { data: plantacions } = await queryPlantacions

    if (!plantacions?.length) { setCicles([]); setCarregant(false); return }

    // 2. Agafar totes les zones implicades
    const zonaIds = [...new Set(plantacions.map(p => p.zona_id || p.zones?.id).filter(Boolean))]

    // 3. Agafar tots els registres posteriors per aquelles zones
    const { data: registresZones } = await supabase
      .from('registres')
      .select(`
        id, zona_id, data, quantitat, unitat, notes, lluna, temp_max, temp_min, codi_temps, pluja_setmana, pluja_real,
        tasques(nom), cultius(nom), varietats(nom)
      `)
      .in('zona_id', zonaIds)
      .order('data', { ascending: true })

    // 4. Agrupar plantacions per data + varietat (mateix dia = mateix cicle)
    const ciclesMap = {}
    plantacions.forEach(p => {
      const varNom = p.varietats?.nom || '-'
      const clau = `${p.data}||${varNom}`
      if (!ciclesMap[clau]) {
        ciclesMap[clau] = {
          dataInici: p.data,
          varietat: varNom,
          varietatId: p.varietats?.id,
          zones: [],
          sembra: p,
          collites: [],
          dataFi: null,
          estat: 'actiu',
          notes: p.notes ? [{ data: p.data, tasca: 'Sembra', text: p.notes }] : [],
        }
      }
      const zonaInfo = `${p.zones?.camps?.pobles?.nom} · ${p.zones?.camps?.nom} · Z${p.zones?.codi}`
      if (!ciclesMap[clau].zones.includes(zonaInfo)) {
        ciclesMap[clau].zones.push(zonaInfo)
      }
      // Guardar zona_id per buscar registres posteriors
      if (!ciclesMap[clau].zonaIds) ciclesMap[clau].zonaIds = []
      const zonaId = p.zona_id || p.zones?.id
      if (zonaId && !ciclesMap[clau].zonaIds.includes(zonaId)) {
        ciclesMap[clau].zonaIds.push(zonaId)
      }
    })

    // 5. Per cada cicle, buscar collites i neteja posteriors
    const ciclesFinals = Object.values(ciclesMap).map(cicle => {
      const regsDelCicle = (registresZones || []).filter(r => {
        if (!cicle.zonaIds?.includes(r.zona_id)) return false
        if (r.data < cicle.dataInici) return false
        return true
      })

      regsDelCicle.forEach(r => {
        const tasca = r.tasques?.nom
        if (tasca === 'Collir') {
          cicle.collites.push(r)
          if (r.notes) cicle.notes.push({ data: r.data, tasca: 'Collir', text: r.notes })
        } else if (tasca === 'Netejar' && cicle.estat === 'actiu') {
          cicle.dataFi = r.data
          cicle.estat = 'tancat'
        } else if (r.notes && !['Plantar','Sembrar','Zona permanent'].includes(tasca)) {
          cicle.notes.push({ data: r.data, tasca, text: r.notes })
        }
      })

      return cicle
    })

    ciclesFinals.sort((a,b) => new Date(b.dataInici) - new Date(a.dataInici))
    setCicles(ciclesFinals)
    setCarregant(false)
  }

  function formatData(data) {
    if (!data) return '—'
    return new Date(data).toLocaleDateString('ca-ES', { day:'numeric', month:'short', year:'numeric' })
  }

  function diesEntreDates(d1, d2) {
    if (!d1 || !d2) return null
    return Math.round((new Date(d2) - new Date(d1)) / 86400000)
  }

  function totalCollita(cicle) {
    const total = cicle.collites.reduce((s, r) => s + (parseFloat(r.quantitat) || 0), 0)
    const unitat = cicle.collites[0]?.unitat || 'kg'
    return total > 0 ? `${total.toFixed(1)} ${unitat}` : null
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={styles.titol}>📊 Informe de cicles</div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

        <div style={styles.filtres}>
          <select style={styles.select} value={cultiuSeleccionat?.id || ''}
            onChange={e => {
              const c = cultius.find(c => c.id === parseInt(e.target.value))
              setCultiuSeleccionat(c || null)
              setCicles([])
            }}>
            <option value="">Selecciona un cultiu</option>
            {cultius.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>

          {varietats.length > 0 && (
            <select style={styles.select} value={varietatSeleccionada?.id || ''}
              onChange={e => {
                const v = varietats.find(v => v.id === parseInt(e.target.value))
                setVarietatSeleccionada(v || null)
              }}>
              <option value="">Totes les varietats</option>
              {varietats.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
            </select>
          )}

          {cicles.length > 0 && (
            <span style={styles.resum}>
              {cicles.length} cicle{cicles.length !== 1 ? 's' : ''} ·
              {' '}{cicles.filter(c => c.estat === 'actiu').length} actiu{cicles.filter(c => c.estat === 'actiu').length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div style={styles.cos}>
          {!cultiuSeleccionat && (
            <div style={styles.centrat}>
              <div style={{fontSize:'40px', marginBottom:'12px'}}>📊</div>
              <div style={{color:'#aaa'}}>Selecciona un cultiu per veure els seus cicles</div>
            </div>
          )}

          {carregant && <div style={styles.centrat}>Carregant cicles...</div>}

          {!carregant && cultiuSeleccionat && cicles.length === 0 && (
            <div style={styles.centrat}>
              <div style={{color:'#aaa'}}>No hi ha cicles registrats per aquest cultiu</div>
            </div>
          )}

          {!carregant && cicles.map((cicle, idx) => {
            const avui = new Date().toISOString().split('T')[0]
            const dataFiCalc = cicle.dataFi || (cicle.collites.length > 0 ? cicle.collites[cicle.collites.length-1].data : null)
            const dies = diesEntreDates(cicle.dataInici, dataFiCalc || avui)
            const totalQ = totalCollita(cicle)
            const esExpandit = expandit === idx

            return (
              <div key={idx} style={styles.cicle}>
                <div style={styles.cicleHeader} onClick={() => setExpandit(esExpandit ? null : idx)}>
                  <div style={{flex:1}}>
                    <div style={styles.cicleZones}>
                      {cicle.zones.join(' · ')}
                    </div>
                    {cicle.varietat && cicle.varietat !== '-' && (
                      <div style={styles.cicleVarietat}>Varietat: {cicle.varietat}</div>
                    )}
                    <div style={styles.cicleDates}>
                      📅 {formatData(cicle.dataInici)}
                      {' → '}
                      {cicle.estat === 'actiu'
                        ? <span style={{color:'#1D9E75', fontWeight:'500'}}>Actiu</span>
                        : formatData(cicle.dataFi)
                      }
                      {dies && <span style={styles.cicleDies}> · {dies} dies</span>}
                    </div>
                    <div style={styles.cicleResum}>
                      {cicle.collites.length > 0
                        ? <span>🧺 {cicle.collites.length} collita{cicle.collites.length !== 1 ? 'es' : ''}{totalQ ? ` · ${totalQ}` : ''}</span>
                        : <span style={{color:'#aaa'}}>Sense collites registrades</span>
                      }
                    </div>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px'}}>
                    <span style={{...styles.badge, background: cicle.estat==='actiu'?'#E1F5EE':'#f0f0f0', color: cicle.estat==='actiu'?'#0F6E56':'#888'}}>
                      {cicle.estat === 'actiu' ? '🌱 Actiu' : '✓ Tancat'}
                    </span>
                    <span style={{fontSize:'12px', color:'#aaa'}}>{esExpandit ? '▲' : '▼'}</span>
                  </div>
                </div>

                {esExpandit && (
                  <div style={styles.cicleDetall}>
                    {/* Sembra */}
                    <div style={styles.seccioDetall}>
                      <div style={styles.seccioTitol}>🌱 Sembra / Plantació</div>
                      <div style={styles.meteoFila}>
                        <span style={{fontWeight:'500'}}>{formatData(cicle.sembra.data)}</span>
                        {cicle.sembra.temp_max && (
                          <span>{ICONS_TEMPS[cicle.sembra.codi_temps]||'🌡️'} {cicle.sembra.temp_max}°/{cicle.sembra.temp_min}°</span>
                        )}
                        {cicle.sembra.lluna !== null && cicle.sembra.lluna !== undefined && (
                          <span>{FASES_LLUNA[cicle.sembra.lluna]}</span>
                        )}
                        {cicle.sembra.pluja_setmana !== null && (
                          <span>🌧️ {cicle.sembra.pluja_setmana}mm setmana anterior</span>
                        )}
                      </div>
                      {cicle.sembra.notes && (
                        <div style={styles.notaText}>💬 {cicle.sembra.notes}</div>
                      )}
                    </div>

                    {/* Collites */}
                    {cicle.collites.length > 0 && (
                      <div style={styles.seccioDetall}>
                        <div style={styles.seccioTitol}>🧺 Collites</div>
                        {cicle.collites.map((col, i) => {
                          const diesDesSembra = diesEntreDates(cicle.dataInici, col.data)
                          const diesAnterior = i > 0 ? diesEntreDates(cicle.collites[i-1].data, col.data) : null
                          return (
                            <div key={col.id} style={styles.collitaFila}>
                              <div style={styles.collitaData}>
                                {formatData(col.data)}
                                {diesDesSembra && <span style={styles.cicleDies}> +{diesDesSembra}d des de sembra</span>}
                                {diesAnterior && <span style={{color:'#aaa', fontSize:'11px'}}> (interval: {diesAnterior}d)</span>}
                              </div>
                              <div style={styles.collitaInfo}>
                                {col.quantitat && <span style={styles.collitaQ}>{col.quantitat} {col.unitat||''}</span>}
                                {col.temp_max && <span>{ICONS_TEMPS[col.codi_temps]||'🌡️'} {col.temp_max}°/{col.temp_min}°</span>}
                                {col.lluna !== null && col.lluna !== undefined && <span>{FASES_LLUNA[col.lluna]}</span>}
                                {col.pluja_real && <span>🌧️ {col.pluja_real}mm setmana</span>}
                              </div>
                              {col.notes && <div style={styles.notaText}>💬 {col.notes}</div>}
                            </div>
                          )
                        })}
                        {totalQ && (
                          <div style={styles.totalCollita}>
                            Total: {totalQ}
                            {cicle.collites.length > 1 && dies && ` · Interval mitjà: ${Math.round(dies / cicle.collites.length)}d`}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Observacions d'altres tasques */}
                    {cicle.notes.filter(n => n.tasca !== 'Sembra' && n.tasca !== 'Collir' && n.text).length > 0 && (
                      <div style={styles.seccioDetall}>
                        <div style={styles.seccioTitol}>💬 Observacions</div>
                        {cicle.notes.filter(n => n.tasca !== 'Sembra' && n.tasca !== 'Collir' && n.text).map((n, i) => (
                          <div key={i} style={styles.notaFila}>
                            <span style={styles.notaData}>{formatData(n.data)}</span>
                            {n.tasca && <span style={styles.notaTasca}>{n.tasca}</span>}
                            <span style={styles.notaText}>{n.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(800px, 97vw)', height:'88vh', display:'flex', flexDirection:'column' },
  cap: { padding:'14px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 },
  titol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999' },
  filtres: { display:'flex', gap:'10px', padding:'10px 16px', borderBottom:'1px solid #eee', flexShrink:0, flexWrap:'wrap', alignItems:'center' },
  select: { padding:'7px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', color:'#333' },
  resum: { fontSize:'12px', color:'#888', marginLeft:'auto' },
  cos: { flex:1, overflowY:'auto', padding:'12px 16px' },
  centrat: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'200px', color:'#aaa', fontSize:'14px' },
  cicle: { border:'1px solid #eee', borderRadius:'10px', marginBottom:'10px', overflow:'hidden' },
  cicleHeader: { padding:'12px 16px', cursor:'pointer', display:'flex', gap:'12px', alignItems:'flex-start', background:'white' },
  cicleZones: { fontSize:'12px', color:'#888', marginBottom:'2px' },
  cicleVarietat: { fontSize:'13px', fontWeight:'600', color:'#333', marginBottom:'3px' },
  cicleDates: { fontSize:'12px', color:'#555', marginBottom:'3px' },
  cicleDies: { color:'#1D9E75', fontWeight:'600' },
  cicleResum: { fontSize:'12px', color:'#888' },
  badge: { padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'500' },
  cicleDetall: { padding:'12px 16px', borderTop:'1px solid #f0f0f0', background:'#fafafa' },
  seccioDetall: { marginBottom:'14px' },
  seccioTitol: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' },
  meteoFila: { display:'flex', gap:'12px', flexWrap:'wrap', fontSize:'13px', color:'#555', marginBottom:'4px' },
  collitaFila: { padding:'7px 0', borderBottom:'0.5px solid #eee' },
  collitaData: { fontSize:'13px', color:'#333', fontWeight:'500', marginBottom:'3px' },
  collitaInfo: { display:'flex', gap:'12px', fontSize:'12px', color:'#666', flexWrap:'wrap' },
  collitaQ: { color:'#1D9E75', fontWeight:'600' },
  totalCollita: { fontSize:'12px', fontWeight:'600', color:'#1D9E75', marginTop:'8px', padding:'6px 0' },
  notaFila: { display:'flex', gap:'8px', padding:'4px 0', fontSize:'12px', borderBottom:'0.5px solid #eee', flexWrap:'wrap' },
  notaData: { color:'#aaa', minWidth:'80px', flexShrink:0 },
  notaTasca: { color:'#888', fontStyle:'italic', flexShrink:0 },
  notaText: { color:'#555', fontSize:'12px', marginTop:'3px' },
}
