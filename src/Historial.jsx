import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const ICONS_TASCA = {
  'Plantar': '🌱', 'Sembrar': '🌾', 'Regar': '💧', 'Collir': '🧺',
  'Abonar': '🪣', 'Ruixar': '🚿', 'Podar': '✂️', 'Netejar': '🧹',
  'Preparar terra': '⛏️', 'Aclarir': '✂️', 'Treure herbes': '🌿',
  'Fer planter': '🪴', 'Calçar': '🌍', 'Altres': '📝', 'Zona permanent': '📌'
}

export default function Historial({ zones, onTancar }) {
  const [registres, setRegistres] = useState([])
  const [carregant, setCarregant] = useState(true)
  const [vistaActiva, setVistaActiva] = useState('cronologic')

  useEffect(() => { carregaHistorial() }, [zones])

  async function carregaHistorial() {
    setCarregant(true)
    const zonaIds = zones.map(z => z.id)
    const { data } = await supabase
      .from('registres')
      .select(`
        *,
        zones(codi, nom),
        cultius(nom),
        varietats(nom),
        tasques(nom),
        subtasques(nom),
        usuaris(nom)
      `)
      .in('zona_id', zonaIds)
      .order('data', { ascending: false })
    setRegistres(data || [])
    setCarregant(false)
  }

  function agrupaPer(clau) {
    const grups = {}
    registres.forEach(r => {
      const k = clau(r)
      if (!grups[k]) grups[k] = []
      grups[k].push(r)
    })
    return grups
  }

  function formatData(data) {
    return new Date(data).toLocaleDateString('ca-ES', { day:'numeric', month:'short', year:'numeric' })
  }

  function titolSeleccio() {
    if (zones.length === 1) return `Zona ${zones[0].codi}`
    const codis = zones.map(z => z.codi).sort().join(', ')
    if (codis.length > 30) return `${zones.length} zones seleccionades`
    return `Zones ${codis}`
  }

function cultiusActius() {
    const tasquesPlantacio = ['Plantar','Sembrar','Zona permanent']
    const resultat = {}
    zones.forEach(zona => {
      const regsZona = registres.filter(r => r.zona_id === zona.id)
      const ultimaNetejar = regsZona.filter(r => r.tasques?.nom === 'Netejar')[0]
      const plantacions = regsZona.filter(r => {
        if (!tasquesPlantacio.includes(r.tasques?.nom)) return false
        if (ultimaNetejar && new Date(r.data) <= new Date(ultimaNetejar.data)) return false
        return true
      })
      if (!plantacions.length) return

      plantacions.forEach(p => {
        const nomCultiu = p.cultius?.nom
        const nomVarietat = p.varietats?.nom
        if (!nomCultiu) return
        const clau = `${nomCultiu}-${nomVarietat}`
        if (!resultat[clau]) {
          resultat[clau] = {
            nom: nomCultiu,
            varietat: nomVarietat && nomVarietat !== '-' ? nomVarietat : null,
            data: p.data,
            zones: [zona.codi]
          }
        } else {
          if (!resultat[clau].zones.includes(zona.codi)) {
            resultat[clau].zones.push(zona.codi)
          }
        }
      })
    })
    return Object.values(resultat)
  }

  const cultsActius = cultiusActius()

  const vistes = [
    { id: 'cronologic', label: 'Cronològic' },
    { id: 'per-cultiu', label: 'Per cultiu' },
    { id: 'per-tasca', label: 'Per tasca' },
  ]

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div>
            <div style={styles.titol}>{titolSeleccio()}</div>
            <div style={styles.sub}>{registres.length} registres</div>
          </div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

{cultsActius.length > 0 && (
          <div style={{borderBottom:'1px solid #b5e0d0'}}>
            {cultsActius.map((c, i) => (
              <div key={i} style={styles.cultiuActiu}>
                <span style={styles.cultiuActiuIco}>🌱</span>
                <div>
                  <div style={styles.cultiuActiuNom}>
                    {c.nom}
                    {c.varietat && c.varietat !== '-' && ` · ${c.varietat}`}
                  </div>
                  <div style={styles.cultiuActiuData}>
                    Plantat el {formatData(c.data)}
                    {c.zones.length > 0 && ` · Zones: ${c.zones.join(', ')}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={styles.tabs}>
          {vistes.map(v => (
            <button key={v.id}
              style={{...styles.tab, ...(vistaActiva===v.id ? styles.tabActiu : {})}}
              onClick={() => setVistaActiva(v.id)}>
              {v.label}
            </button>
          ))}
        </div>

        <div style={styles.cos}>
          {carregant ? (
            <div style={styles.centrat}>Carregant historial...</div>
          ) : registres.length === 0 ? (
            <div style={styles.centrat}>Encara no hi ha registres per aquesta zona</div>
          ) : vistaActiva === 'cronologic' ? (
            <VistaCronologica registres={registres} formatData={formatData} />
          ) : vistaActiva === 'per-cultiu' ? (
            <VistaPerCultiu registres={registres} formatData={formatData} agrupaPer={agrupaPer} />
          ) : (
            <VistaPerTasca registres={registres} formatData={formatData} agrupaPer={agrupaPer} />
          )}
        </div>

        <div style={styles.peu}>
          <button style={styles.botoSecundari} onClick={onTancar}>Tancar</button>
        </div>
      </div>
    </div>
  )
}


function VistaCronologica({ registres, formatData }) {
  const [expandit, setExpandit] = useState(null)

  const FASES_LLUNA = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘']
  const FASES_NOM = ['Lluna nova','Creixent','Quart creixent','Gibosa creixent','Lluna plena','Gibosa minvant','Quart minvant','Creixent minvant']
  const ICONS_TEMPS = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',80:'🌦️',95:'⛈️'}
  const DESC_TEMPS = {0:'Cel clar',1:'Poc ennuvolat',2:'Parcialment ennuvolat',3:'Ennuvolat',45:'Boira',51:'Plugim lleuger',61:'Pluja feble',63:'Pluja moderada',65:'Pluja forta',71:'Neu feble',80:'Ruixats',95:'Tempesta'}

  return (
    <div>
      {registres.map(r => {
        const esExpandit = expandit === r.id
        const teMeteo = true // Sempre mostrar opció d'expandir

        return (
          <div key={r.id} style={{...styles.registre, cursor:'pointer'}}
            onClick={() => setExpandit(esExpandit ? null : r.id)}>
            <div style={styles.registreIco}>
              {ICONS_TASCA[r.tasques?.nom] || '📝'}
            </div>
            <div style={styles.registreCos}>
              <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <div style={styles.registreTitol}>
                  {r.tasques?.nom}
                  {r.subtasques?.nom && <span style={styles.subtasca}> · {r.subtasques.nom}</span>}
                </div>
                {teMeteo && (
                  <span style={{fontSize:'11px', color:'#1D9E75', marginLeft:'auto'}}>
                    {esExpandit ? '▲' : '▼'} meteo
                  </span>
                )}
              </div>
              {r.cultius?.nom && (
                <div style={styles.registreCultiu}>
                  🌱 {r.cultius.nom}
                  {r.varietats?.nom && r.varietats.nom !== '-' && ` · ${r.varietats.nom}`}
                </div>
              )}
              <div style={styles.registreMeta}>
                <span>📅 {formatData(r.data)}</span>
                {r.zones?.codi && <span>📍 Zona {r.zones.codi}</span>}
                {r.quantitat && <span>⚖️ {r.quantitat} {r.unitat || ''}</span>}
                {r.usuaris?.nom && <span>👤 {r.usuaris.nom}</span>}
              </div>
              {(r.cost_ma_obra || r.cost_producte) && (
                <div style={styles.registreCost}>
                  💶 {((r.cost_ma_obra||0)+(r.cost_producte||0)).toFixed(2)}€
                  {r.nom_producte && ` · ${r.nom_producte}`}
                </div>
              )}
              {r.notes && <div style={styles.registreNotes}>💬 {r.notes}</div>}

              {esExpandit && teMeteo && (
                <div style={styles.meteoBox}>
                  {r.temp_max !== null && (
                    <div style={styles.meteoFila}>
                      <span>{ICONS_TEMPS[r.codi_temps] || '🌡️'}</span>
                      <span>{DESC_TEMPS[r.codi_temps] || '—'}</span>
                      <span>{r.temp_max}° / {r.temp_min}°</span>
                    </div>
                  )}
                  {r.lluna !== null && (
                    <div style={styles.meteoFila}>
                      <span>{FASES_LLUNA[r.lluna]}</span>
                      <span>{FASES_NOM[r.lluna]}</span>
                    </div>
                  )}
                  {r.pluja_setmana !== null && (
                    <div style={styles.meteoFila}>
                      <span>🌧️</span>
                      <span>Pluja setmana anterior</span>
                      <span>{r.pluja_setmana} mm</span>
                    </div>
                  )}
                  {r.pluja_prevista !== null && (
                    <div style={styles.meteoFila}>
                      <span>🔮</span>
                      <span>Previsió setmana següent</span>
                      <span>{r.pluja_prevista} mm</span>
                    </div>
                  )}
                  {r.pluja_real !== null && (
                    <div style={{...styles.meteoFila, color:'#1D9E75'}}>
                      <span>✅</span>
                      <span>Pluja real setmana següent</span>
                      <span>{r.pluja_real} mm</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VistaPerCultiu({ registres, formatData, agrupaPer }) {
  const grups = agrupaPer(r => r.cultius?.nom || 'Sense cultiu')
  return (
    <div>
      {Object.entries(grups).map(([cultiu, regs]) => (
        <div key={cultiu} style={styles.grup}>
          <div style={styles.grupTitol}>🌱 {cultiu}</div>
          {regs.map(r => (
            <div key={r.id} style={styles.registrePetit}>
              <span style={styles.registrePetitData}>{formatData(r.data)}</span>
              <span style={styles.registrePetitTasca}>{r.tasques?.nom}</span>
              {r.subtasques?.nom && <span style={styles.subtasca}>{r.subtasques.nom}</span>}
              {r.quantitat && <span style={styles.registrePetitQ}>{r.quantitat} {r.unitat||''}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function VistaPerTasca({ registres, formatData, agrupaPer }) {
  const grups = agrupaPer(r => r.tasques?.nom || 'Altres')
  return (
    <div>
      {Object.entries(grups).map(([tasca, regs]) => (
        <div key={tasca} style={styles.grup}>
          <div style={styles.grupTitol}>{ICONS_TASCA[tasca]||'📝'} {tasca} <span style={styles.grupCount}>({regs.length})</span></div>
          {regs.map(r => (
            <div key={r.id} style={styles.registrePetit}>
              <span style={styles.registrePetitData}>{formatData(r.data)}</span>
              {r.cultius?.nom && <span style={styles.registrePetitTasca}>{r.cultius.nom}</span>}
              {r.quantitat && <span style={styles.registrePetitQ}>{r.quantitat} {r.unitat||''}</span>}
              {r.zones?.codi && <span style={styles.subtasca}>Z{r.zones.codi}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(580px, 95vw)', maxHeight:'90vh', display:'flex', flexDirection:'column' },
  cap: { padding:'16px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  titol: { fontSize:'17px', fontWeight:'600', color:'#333' },
  sub: { fontSize:'13px', color:'#888', marginTop:'2px' },
  botoTancar: { background:'none', border:'none', fontSize:'18px', cursor:'pointer', color:'#999' },
  cultiuActiu: { background:'#E1F5EE', padding:'12px 20px', display:'flex', gap:'12px', alignItems:'center', borderBottom:'1px solid #b5e0d0' },
  cultiuActiuIco: { fontSize:'24px' },
  cultiuActiuNom: { fontSize:'15px', fontWeight:'600', color:'#0F6E56' },
  cultiuActiuData: { fontSize:'12px', color:'#555', marginTop:'2px' },
  tabs: { display:'flex', gap:'4px', padding:'10px 16px', borderBottom:'1px solid #eee' },
  tab: { padding:'6px 14px', fontSize:'13px', border:'0.5px solid #ddd', borderRadius:'20px', cursor:'pointer', background:'white', color:'#666' },
  tabActiu: { background:'#1D9E75', color:'white', borderColor:'#1D9E75', fontWeight:'500' },
  cos: { flex:1, overflowY:'auto', padding:'16px 20px' },
  peu: { padding:'14px 20px', borderTop:'1px solid #eee', display:'flex', justifyContent:'flex-end' },
  centrat: { textAlign:'center', color:'#aaa', padding:'40px 0', fontSize:'14px' },
  registre: { display:'flex', gap:'12px', padding:'12px 0', borderBottom:'1px solid #f0f0f0' },
  registreIco: { fontSize:'20px', flexShrink:0, marginTop:'2px' },
  registreCos: { flex:1 },
  registreTitol: { fontSize:'14px', fontWeight:'600', color:'#333', marginBottom:'3px' },
  subtasca: { fontWeight:'400', color:'#888', fontSize:'13px' },
  registreCultiu: { fontSize:'13px', color:'#1D9E75', marginBottom:'4px' },
  registreMeta: { display:'flex', gap:'10px', fontSize:'12px', color:'#888', flexWrap:'wrap' },
  registreCost: { fontSize:'12px', color:'#888', marginTop:'4px' },
  registreNotes: { fontSize:'12px', color:'#666', marginTop:'4px', fontStyle:'italic' },
  grup: { marginBottom:'20px' },
  grupTitol: { fontSize:'13px', fontWeight:'600', color:'#333', padding:'6px 0', borderBottom:'1px solid #eee', marginBottom:'8px' },
  grupCount: { fontWeight:'400', color:'#aaa' },
  registrePetit: { display:'flex', gap:'8px', alignItems:'center', padding:'5px 0', fontSize:'13px', borderBottom:'0.5px solid #f5f5f5', flexWrap:'wrap' },
  registrePetitData: { color:'#aaa', minWidth:'80px' },
  registrePetitTasca: { color:'#333', fontWeight:'500' },
  registrePetitQ: { color:'#1D9E75', marginLeft:'auto' },
  botoSecundari: { padding:'10px 24px', background:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', fontSize:'14px', cursor:'pointer' },
  meteoBox: { background:'#f0f9f5', border:'1px solid #b5e0d0', borderRadius:'8px', padding:'10px', marginTop:'8px', display:'flex', flexDirection:'column', gap:'6px' },
  meteoFila: { display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'#555' }
}
