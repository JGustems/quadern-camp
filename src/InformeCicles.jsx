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

    // Agafar tots els registres del cultiu seleccionat
    let query = supabase
      .from('registres')
      .select(`
        id, data, quantitat, unitat, notes, lluna, temp_max, temp_min, codi_temps, pluja_setmana, pluja_real,
        tasques(nom), zones(codi, camp_id, camps(nom, pobles(nom))), varietats(nom)
      `)
      .eq('cultiu_id', cultiuSeleccionat.id)
      .order('data', { ascending: true })

    if (varietatSeleccionada) {
      query = query.eq('varietat_id', varietatSeleccionada.id)
    }

    const { data: registres } = await query
    if (!registres) { setCicles([]); setCarregant(false); return }

    // Agrupar per zona
    const perZona = {}
    registres.forEach(r => {
      const zonaKey = `${r.zones?.camps?.pobles?.nom} · ${r.zones?.camps?.nom} · Zona ${r.zones?.codi}`
      if (!perZona[zonaKey]) perZona[zonaKey] = []
      perZona[zonaKey].push(r)
    })

    // Construir cicles per cada zona
    const totsCicles = []
    Object.entries(perZona).forEach(([zonaKey, regs]) => {
      const tasquesInici = ['Plantar', 'Sembrar', 'Zona permanent']
      let cicleActual = null

      regs.forEach(r => {
        const tasca = r.tasques?.nom

        if (tasquesInici.includes(tasca)) {
          // Nou cicle
          if (cicleActual) totsCicles.push({ ...cicleActual, zona: zonaKey })
          cicleActual = {
            dataInici: r.data,
            dataFi: null,
            estat: 'actiu',
            sembra: r,
            collites: [],
            netejar: null,
            notes: r.notes ? [{ data: r.data, text: r.notes }] : [],
          }
        } else if (tasca === 'Collir' && cicleActual) {
          cicleActual.collites.push(r)
          if (r.notes) cicleActual.notes.push({ data: r.data, text: r.notes })
        } else if (tasca === 'Netejar' && cicleActual) {
          cicleActual.dataFi = r.data
          cicleActual.estat = 'tancat'
          cicleActual.netejar = r
          totsCicles.push({ ...cicleActual, zona: zonaKey })
          cicleActual = null
        } else if (cicleActual && r.notes) {
          cicleActual.notes.push({ data: r.data, tasca, text: r.notes })
        }
      })

      if (cicleActual) totsCicles.push({ ...cicleActual, zona: zonaKey })
    })

    // Ordenar per data d'inici desc
    totsCicles.sort((a,b) => new Date(b.dataInici) - new Date(a.dataInici))
    setCicles(totsCicles)
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
    const total = cicle.collites.reduce((s, r) => s + (r.quantitat || 0), 0)
    const unitat = cicle.collites[0]?.unitat || 'kg'
    return total > 0 ? `${total.toFixed(1)} ${unitat}` : null
  }

  function plujaAcumulada(cicle) {
    const vals = cicle.collites.map(r => r.pluja_real || 0).filter(v => v > 0)
    if (!vals.length) return null
    return vals.reduce((s,v) => s+v, 0).toFixed(1)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={styles.titol}>📊 Informe de cicles</div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

        {/* Filtres */}
        <div style={styles.filtres}>
          <select style={styles.select} value={cultiuSeleccionat?.id || ''}
            onChange={e => {
              const c = cultius.find(c => c.id === parseInt(e.target.value))
              setCultiuSeleccionat(c || null)
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
              {cicles.filter(c => c.estat === 'actiu').length} actiu{cicles.filter(c => c.estat === 'actiu').length !== 1 ? 's' : ''}
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
            const dies = diesEntreDates(cicle.dataInici, cicle.dataFi || new Date().toISOString().split('T')[0])
            const totalQ = totalCollita(cicle)
            const pluja = plujaAcumulada(cicle)
            const esExpandit = expandit === idx

            return (
              <div key={idx} style={styles.cicle}>
                {/* Capçalera del cicle */}
                <div style={styles.cicleHeader} onClick={() => setExpandit(esExpandit ? null : idx)}>
                  <div style={{flex:1}}>
                    <div style={styles.cicleZona}>{cicle.zona}</div>
                    <div style={styles.cicleDates}>
                      📅 {formatData(cicle.dataInici)} → {cicle.estat === 'actiu' ? <span style={{color:'#1D9E75', fontWeight:'500'}}>Actiu</span> : formatData(cicle.dataFi)}
                      {dies && <span style={styles.cicleDies}> · {dies} dies</span>}
                    </div>
                    <div style={styles.cicleResum}>
                      {cicle.collites.length > 0 && <span>🧺 {cicle.collites.length} collita{cicle.collites.length !== 1 ? 'es' : ''}</span>}
                      {totalQ && <span> · {totalQ}</span>}
                      {cicle.sembra?.varietats?.nom && cicle.sembra.varietats.nom !== '-' && (
                        <span style={{color:'#888'}}> · {cicle.sembra.varietats.nom}</span>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px'}}>
                    <span style={{...styles.badge, background: cicle.estat==='actiu'?'#E1F5EE':'#f0f0f0', color: cicle.estat==='actiu'?'#0F6E56':'#888'}}>
                      {cicle.estat === 'actiu' ? '🌱 Actiu' : '✓ Tancat'}
                    </span>
                    <span style={{fontSize:'12px', color:'#aaa'}}>{esExpandit ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Detall expandit */}
                {esExpandit && (
                  <div style={styles.cicleDetall}>
                    {/* Sembra */}
                    <div style={styles.seccioDetall}>
                      <div style={styles.seccioTitol}>🌱 Sembra / Plantació</div>
                      <div style={styles.meteoFila}>
                        <span>{formatData(cicle.sembra.data)}</span>
                        {cicle.sembra.temp_max && <span>{ICONS_TEMPS[cicle.sembra.codi_temps]||'🌡️'} {cicle.sembra.temp_max}°/{cicle.sembra.temp_min}°</span>}
                        {cicle.sembra.lluna !== null && <span>{FASES_LLUNA[cicle.sembra.lluna]}</span>}
                        {cicle.sembra.pluja_setmana !== null && <span>🌧️ {cicle.sembra.pluja_setmana}mm setmana anterior</span>}
                      </div>
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
                                {diesDesSembra && <span style={styles.collitaDies}> +{diesDesSembra}d</span>}
                                {diesAnterior && <span style={styles.collitaDies2}> (interval: {diesAnterior}d)</span>}
                              </div>
                              <div style={styles.collitaInfo}>
                                {col.quantitat && <span style={styles.collitaQ}>{col.quantitat} {col.unitat||''}</span>}
                                {col.temp_max && <span>{ICONS_TEMPS[col.codi_temps]||'🌡️'} {col.temp_max}°/{col.temp_min}°</span>}
                                {col.lluna !== null && <span>{FASES_LLUNA[col.lluna]}</span>}
                              </div>
                              {col.notes && <div style={styles.collitaNotes}>💬 {col.notes}</div>}
                            </div>
                          )
                        })}
                        {totalQ && (
                          <div style={styles.totalCollita}>
                            Total: {totalQ}
                            {cicle.collites.length > 1 && ` · Interval mitjà: ${Math.round(dies / cicle.collites.length)} dies`}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes d'altres tasques */}
                    {cicle.notes.filter(n => n.tasca && n.tasca !== 'Collir').length > 0 && (
                      <div style={styles.seccioDetall}>
                        <div style={styles.seccioTitol}>💬 Observacions</div>
                        {cicle.notes.filter(n => n.tasca && n.tasca !== 'Collir').map((n, i) => (
                          <div key={i} style={styles.notaFila}>
                            <span style={styles.notaData}>{formatData(n.data)}</span>
                            {n.tasca && <span style={styles.notaTasca}>{n.tasca}</span>}
                            <span style={styles.notaText}>{n.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resum meteo del cicle */}
                    {pluja && (
                      <div style={styles.seccioDetall}>
                        <div style={styles.seccioTitol}>🌧️ Pluja durant el cicle</div>
                        <div style={{fontSize:'13px', color:'#555'}}>{pluja} mm acumulats (de les setmanes de collita)</div>
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
  centrat: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#aaa', fontSize:'14px' },
  cicle: { border:'1px solid #eee', borderRadius:'10px', marginBottom:'10px', overflow:'hidden' },
  cicleHeader: { padding:'12px 16px', cursor:'pointer', display:'flex', gap:'12px', alignItems:'flex-start' },
  cicleZona: { fontSize:'13px', fontWeight:'600', color:'#333', marginBottom:'3px' },
  cicleDates: { fontSize:'12px', color:'#555', marginBottom:'3px' },
  cicleDies: { color:'#1D9E75', fontWeight:'500' },
  cicleResum: { fontSize:'12px', color:'#888' },
  badge: { padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'500' },
  cicleDetall: { padding:'12px 16px', borderTop:'1px solid #f0f0f0', background:'#fafafa' },
  seccioDetall: { marginBottom:'14px' },
  seccioTitol: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' },
  meteoFila: { display:'flex', gap:'12px', flexWrap:'wrap', fontSize:'13px', color:'#555' },
  collitaFila: { padding:'6px 0', borderBottom:'0.5px solid #eee' },
  collitaData: { fontSize:'13px', color:'#333', fontWeight:'500', marginBottom:'3px' },
  collitaDies: { color:'#1D9E75', fontWeight:'600', fontSize:'12px' },
  collitaDies2: { color:'#aaa', fontSize:'11px' },
  collitaInfo: { display:'flex', gap:'12px', fontSize:'12px', color:'#666', flexWrap:'wrap' },
  collitaQ: { color:'#1D9E75', fontWeight:'600' },
  collitaNotes: { fontSize:'12px', color:'#888', marginTop:'3px', fontStyle:'italic' },
  totalCollita: { fontSize:'12px', fontWeight:'600', color:'#1D9E75', marginTop:'8px', padding:'6px 0' },
  notaFila: { display:'flex', gap:'8px', padding:'4px 0', fontSize:'12px', borderBottom:'0.5px solid #eee', flexWrap:'wrap' },
  notaData: { color:'#aaa', minWidth:'80px' },
  notaTasca: { color:'#888', fontStyle:'italic' },
  notaText: { color:'#555', flex:1 },
}
