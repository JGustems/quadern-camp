import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const FASES_LLUNA = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘']
const ICONS_TEMPS = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'🌨️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️'}
const DESC_TEMPS = {0:'Cel clar',1:'Poc ennuvolat',2:'Parcialment ennuvolat',3:'Ennuvolat',45:'Boira',51:'Plugim lleuger',61:'Pluja feble',63:'Pluja moderada',65:'Pluja forta',71:'Neu feble',80:'Ruixats',95:'Tempesta'}

function faseLluna(data) {
  const d = new Date(data)
  const any = d.getFullYear(), mes = d.getMonth()+1, dia = d.getDate()
  let c, e, jd, b
  if (mes < 3) { const y=any-1; const m=mes+12; c=Math.floor(365.25*y); e=Math.floor(30.6*(m+1)); jd=c+e+dia-694039.09 }
  else { c=Math.floor(365.25*any); e=Math.floor(30.6*(mes+1)); jd=c+e+dia-694039.09 }
  jd /= 29.53; b=Math.floor(jd); jd -= b
  return Math.round(jd*8) % 8
}

export default function FormulariTasca({ zones, camp, onTancar, onGuardat }) {
  const [tasques, setTasques] = useState([])
  const [subtasques, setSubtasques] = useState([])
  const [cultius, setCultius] = useState([])
  const [varietats, setVarietats] = useState([])
  const [usuaris, setUsuaris] = useState([])

  const [tascaId, setTascaId] = useState('')
  const [subtascaId, setSubtascaId] = useState('')
  const [cultiuId, setCultiuId] = useState('')
  const [varietatId, setVarietatId] = useState('')
  const [usuariId, setUsuariId] = useState('')
  const [quantitat, setQuantitat] = useState('')
  const [costMaObra, setCostMaObra] = useState('')
  const [costProducte, setCostProducte] = useState('')
  const [nomProducte, setNomProducte] = useState('')
  const [notes, setNotes] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])

  const [temps, setTemps] = useState(null)
  const [carregantTemps, setCarregantTemps] = useState(false)
  const [guardant, setGuardant] = useState(false)

  const tascaSeleccionada = tasques.find(t => t.id === parseInt(tascaId))
  const mostrarCultiu = ['Plantar','Sembrar','Zona permanent'].includes(tascaSeleccionada?.nom)

  useEffect(() => { carregaDades() }, [])
  useEffect(() => { if (tascaId) carregaSubtasques(tascaId) }, [tascaId])
  useEffect(() => { if (cultiuId) carregaVarietats(cultiuId) }, [cultiuId])
  useEffect(() => { if (data) carregaTemps(data) }, [data])

  async function carregaDades() {
    const [t, c, u] = await Promise.all([
      supabase.from('tasques').select('*').order('nom'),
      supabase.from('cultius').select('*').order('nom'),
      supabase.from('usuaris').select('*').order('nom'),
    ])
    setTasques(t.data || [])
    setCultius(c.data || [])
    setUsuaris(u.data || [])
  }

  async function carregaSubtasques(tId) {
    const { data } = await supabase.from('subtasques').select('*').eq('tasca_id', tId).order('nom')
    setSubtasques(data || [])
    setSubtascaId('')
  }

  async function carregaVarietats(cId) {
    const { data } = await supabase.from('varietats').select('*').eq('cultiu_id', cId).order('nom')
    setVarietats(data || [])
    setVarietatId('')
  }

  async function carregaTemps(data) {
    setCarregantTemps(true)
    try {
      const coordenades = obtenirCoordenades()
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coordenades.lat}&longitude=${coordenades.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max,relativehumidity_2m_max&timezone=Europe/Madrid&start_date=${data}&end_date=${data}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.daily) {
        setTemps({
          tmax: Math.round(json.daily.temperature_2m_max[0]),
          tmin: Math.round(json.daily.temperature_2m_min[0]),
          codi: json.daily.weathercode[0],
          pluja: json.daily.precipitation_sum[0]?.toFixed(1),
          vent: Math.round(json.daily.windspeed_10m_max[0]),
          humitat: json.daily.relativehumidity_2m_max[0],
          lluna: faseLluna(data),
        })
      }
    } catch(e) { setTemps(null) }
    setCarregantTemps(false)
  }

  function obtenirCoordenades() {
    const coords = {
      'All': { lat: 41.47, lon: 1.52 },
      'Begues': { lat: 41.33, lon: 1.88 },
      'Estoll': { lat: 41.55, lon: 1.48 },
      'Alp': { lat: 42.40, lon: 1.88 },
    }
    return coords[camp?.poble?.nom] || { lat: 41.38, lon: 2.17 }
  }

  async function guardar() {
    if (!tascaId || zones.length === 0) return
    setGuardant(true)
    const registres = zones.map(zona => ({
      zona_id: zona.id,
      cultiu_id: cultiuId ? parseInt(cultiuId) : null,
      varietat_id: varietatId ? parseInt(varietatId) : null,
      tasca_id: parseInt(tascaId),
      subtasca_id: subtascaId ? parseInt(subtascaId) : null,
      usuari_id: usuariId ? parseInt(usuariId) : null,
      data,
      quantitat: quantitat ? parseFloat(quantitat) : null,
      unitat: tascaSeleccionada?.unitat || null,
      cost_ma_obra: costMaObra ? parseFloat(costMaObra) : null,
      cost_producte: costProducte ? parseFloat(costProducte) : null,
      nom_producte: nomProducte || null,
      notes: notes || null,
    }))
    await supabase.from('registres').insert(registres)
    setGuardant(false)
    onGuardat()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalCap}>
          <div>
            <div style={styles.modalTitol}>Nova tasca</div>
            <div style={styles.modalSub}>
              {zones.length === 1 ? `Zona ${zones[0].codi}` : `${zones.length} zones seleccionades`}
            </div>
          </div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

        <div style={styles.modalCos}>
          <div style={styles.grup}>
            <label style={styles.etiqueta}>Data</label>
            <input type="date" style={styles.input} value={data} onChange={e => setData(e.target.value)} />
          </div>

          {temps && (
            <div style={styles.tempsBox}>
              <div style={styles.tempsIco}>{ICONS_TEMPS[temps.codi] || '🌡️'}</div>
              <div style={styles.tempsDades}>
                <div style={styles.tempsTemp}>{temps.tmax}° / {temps.tmin}°</div>
                <div style={styles.tempsDesc}>{DESC_TEMPS[temps.codi] || 'Variable'}</div>
              </div>
              <div style={styles.tempsExtra}>
                <span>{FASES_LLUNA[temps.lluna]}</span>
                <span>💧{temps.pluja}mm</span>
                <span>💨{temps.vent}km/h</span>
                <span>☁️{temps.humitat}%</span>
              </div>
            </div>
          )}
          {carregantTemps && <div style={styles.carregant}>Carregant dades meteorològiques...</div>}

          <div style={styles.grup}>
            <label style={styles.etiqueta}>Tasca *</label>
            <select style={styles.input} value={tascaId} onChange={e => setTascaId(e.target.value)}>
              <option value="">Selecciona una tasca</option>
              {tasques.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
          </div>

          {subtasques.length > 0 && (
            <div style={styles.grup}>
              <label style={styles.etiqueta}>Subtasca</label>
              <select style={styles.input} value={subtascaId} onChange={e => setSubtascaId(e.target.value)}>
                <option value="">— cap —</option>
                {subtasques.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
          )}

          {mostrarCultiu && <>
            <div style={styles.grup}>
              <label style={styles.etiqueta}>Cultiu</label>
              <select style={styles.input} value={cultiuId} onChange={e => setCultiuId(e.target.value)}>
                <option value="">Selecciona un cultiu</option>
                {cultius.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            {varietats.length > 0 && (
              <div style={styles.grup}>
                <label style={styles.etiqueta}>Varietat</label>
                <select style={styles.input} value={varietatId} onChange={e => setVarietatId(e.target.value)}>
                  <option value="">— cap —</option>
                  {varietats.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                </select>
              </div>
            )}
          </>}

          <div style={styles.grup}>
            <label style={styles.etiqueta}>Qui ho fa</label>
            <select style={styles.input} value={usuariId} onChange={e => setUsuariId(e.target.value)}>
              <option value="">— no especificat —</option>
              {usuaris.map(u => <option key={u.id} value={u.id}>{u.nom}</option>)}
            </select>
          </div>

          <div style={styles.fila2}>
            <div style={styles.grup}>
              <label style={styles.etiqueta}>Quantitat</label>
              <input type="number" style={styles.input} value={quantitat}
                onChange={e => setQuantitat(e.target.value)}
                placeholder={tascaSeleccionada?.unitat || '0'} />
            </div>
            <div style={styles.grup}>
              <label style={styles.etiqueta}>Unitat</label>
              <input type="text" style={styles.input} value={tascaSeleccionada?.unitat || ''}
                readOnly placeholder="—" />
            </div>
          </div>

          <div style={styles.fila2}>
            <div style={styles.grup}>
              <label style={styles.etiqueta}>Cost mà d'obra (€)</label>
              <input type="number" style={styles.input} value={costMaObra}
                onChange={e => setCostMaObra(e.target.value)} placeholder="0.00" />
            </div>
            <div style={styles.grup}>
              <label style={styles.etiqueta}>Cost producte (€)</label>
              <input type="number" style={styles.input} value={costProducte}
                onChange={e => setCostProducte(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div style={styles.grup}>
            <label style={styles.etiqueta}>Nom producte</label>
            <input type="text" style={styles.input} value={nomProducte}
              onChange={e => setNomProducte(e.target.value)} placeholder="ex: Compost, Coure..." />
          </div>

          <div style={styles.grup}>
            <label style={styles.etiqueta}>Notes</label>
            <textarea style={{...styles.input, height:'70px', resize:'vertical'}}
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Observacions, incidències..." />
          </div>
        </div>

        <div style={styles.modalPeu}>
          <button style={styles.botoSecundari} onClick={onTancar}>Cancel·lar</button>
          <button style={styles.botoPrincipal} onClick={guardar} disabled={!tascaId || guardant}>
            {guardant ? 'Guardant...' : 'Guardar tasca'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(520px, 95vw)', maxHeight:'90vh', display:'flex', flexDirection:'column' },
  modalCap: { padding:'16px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  modalTitol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  modalSub: { fontSize:'13px', color:'#888', marginTop:'2px' },
  botoTancar: { background:'none', border:'none', fontSize:'18px', cursor:'pointer', color:'#999', padding:'0 4px' },
  modalCos: { padding:'16px 20px', overflowY:'auto', flex:1 },
  modalPeu: { padding:'14px 20px', borderTop:'1px solid #eee', display:'flex', gap:'10px', justifyContent:'flex-end' },
  grup: { marginBottom:'12px' },
  etiqueta: { display:'block', fontSize:'12px', color:'#888', marginBottom:'5px', fontWeight:'500' },
  input: { width:'100%', padding:'9px 12px', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', color:'#333', background:'white', boxSizing:'border-box' },
  fila2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' },
  tempsBox: { background:'#f0f9f5', border:'1px solid #b5e0d0', borderRadius:'10px', padding:'12px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' },
  tempsIco: { fontSize:'32px' },
  tempsDades: { flex:1 },
  tempsTemp: { fontSize:'18px', fontWeight:'600', color:'#1D9E75' },
  tempsDesc: { fontSize:'12px', color:'#666', marginTop:'2px' },
  tempsExtra: { display:'flex', gap:'10px', fontSize:'13px', color:'#555', flexWrap:'wrap' },
  carregant: { fontSize:'12px', color:'#aaa', textAlign:'center', padding:'8px', marginBottom:'10px' },
  botoPrincipal: { padding:'10px 24px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', fontSize:'14px', cursor:'pointer', fontWeight:'500' },
  botoSecundari: { padding:'10px 24px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', cursor:'pointer' },
}
