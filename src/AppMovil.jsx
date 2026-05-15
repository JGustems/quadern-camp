import { useState } from 'react'
import { supabase } from './supabase'
import MapaCamp from './MapaCamp.jsx'
import FormulariTasca from './FormulariTasca.jsx'
import Historial from './Historial.jsx'

export default function AppMovil({
  usuari, pobles, camps, zones, cultiusActius, dataConsulta,
  pobleSeleccionat, campSeleccionat, zonesSeleccionades,
  onSeleccionaPoble, onSeleccionaCamp, onToggleZona, onSeleccionaFila,
  onCanviaData, onGuardatTasca, onTancarSessio
}) {
  const [pestanya, setPestanya] = useState('mapa')
  const [mostrarSelectorCamp, setMostrarSelectorCamp] = useState(false)
  const [mostrarFormulari, setMostrarFormulari] = useState(false)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [zonaInfo, setZonaInfo] = useState(null)

  function handleToggleZona(zona) {
    onToggleZona(zona)
    const cultiusZona = cultiusActius?.[zona.id]
    const tots = cultiusZona?.tots || (Array.isArray(cultiusZona) ? cultiusZona : cultiusZona ? [cultiusZona] : [])
    setZonaInfo({
      zona,
      cultius: tots,
    })
  }

  function campAmbPoble() {
    return { ...campSeleccionat, poble: pobleSeleccionat }
  }

  function resumSeleccio() {
    if (zonesSeleccionades.length === 0) return null
    const codis = zonesSeleccionades.map(z => z.codi).sort()
    if (codis.length > 6) return `${codis.length} zones`
    return codis.join(', ')
  }

  return (
    <div style={styles.app}>
      {/* Capçalera */}
      <div style={styles.cap}>
        <div style={styles.capInfo}>
          <div style={styles.capTitol}>🌱 Quadern de Camp</div>
          <div style={styles.capSub} onClick={() => setMostrarSelectorCamp(true)}>
            {campSeleccionat
              ? `${pobleSeleccionat?.nom} · ${campSeleccionat.nom} ▾`
              : 'Selecciona un camp ▾'}
          </div>
        </div>
        <button style={styles.botoSortir} onClick={onTancarSessio}>↩</button>
      </div>

      {/* Selector de camp */}
      {mostrarSelectorCamp && (
        <div style={styles.selectorOverlay} onClick={() => setMostrarSelectorCamp(false)}>
          <div style={styles.selectorModal} onClick={e => e.stopPropagation()}>
            <div style={styles.selectorTitol}>Selecciona camp</div>
            {pobles.map(p => (
              <div key={p.id}>
                <div style={styles.selectorPoble}>{p.nom}</div>
                {camps.filter(c => c.poble_id === p.id).map(c => (
                  <div key={c.id}
                    style={{...styles.selectorCamp, ...(campSeleccionat?.id===c.id?styles.selectorActiu:{})}}
                    onClick={() => { onSeleccionaPoble(p); onSeleccionaCamp(c); setMostrarSelectorCamp(false) }}>
                    {c.nom}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contingut principal */}
      <div style={styles.contingut}>
        {pestanya === 'mapa' && (
          <div style={styles.mapaWrap}>
            {campSeleccionat && zones.length > 0 ? (
              <>
                <MapaCamp
                  camp={campSeleccionat}
                  zones={zones}
                  zonesSeleccionades={zonesSeleccionades}
                  onToggleZona={handleToggleZona}
                  onSeleccionaFila={onSeleccionaFila}
                  cultiusActius={cultiusActius}
                  dataConsulta={dataConsulta}
                  onCanviaData={onCanviaData}
                  modeMovil={true}
                />
                {zonaInfo && (
                  <div style={{
                    position:'absolute', bottom:0, left:0, right:0,
                    background:'white', borderTop:'1px solid #eee',
                    borderRadius:'16px 16px 0 0',
                    padding:'12px 16px 8px',
                    boxShadow:'0 -4px 20px rgba(0,0,0,0.1)',
                    zIndex:10,
                  }}>
                    <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'13px', fontWeight:'600', color:'#333', marginBottom:'4px'}}>
                          Zona {zonaInfo.zona.codi}
                          {zonaInfo.zona.nom && zonaInfo.zona.nom !== zonaInfo.zona.codi && ` · ${zonaInfo.zona.nom}`}
                        </div>
                        {zonaInfo.cultius.length === 0 ? (
                          <div style={{fontSize:'12px', color:'#aaa'}}>Sense cultiu actiu</div>
                        ) : (
                          zonaInfo.cultius.map((c, i) => (
                            <div key={i} style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px'}}>
                              <div style={{width:'10px', height:'10px', borderRadius:'2px', background:c.color||'#ddd', flexShrink:0}}/>
                              <span style={{fontSize:'13px', color:'#333', fontWeight:'500'}}>{c.nom}</span>
                              {c.varietat && c.varietat !== '-' && (
                                <span style={{fontSize:'12px', color:'#888'}}>· {c.varietat}</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      <button style={{background:'none', border:'none', fontSize:'18px', color:'#aaa', cursor:'pointer', padding:'0 0 0 8px'}}
                        onClick={() => setZonaInfo(null)}>✕</button>
                    </div>
                    <div style={{display:'flex', gap:'8px', marginTop:'10px'}}>
                      <button style={{flex:1, padding:'10px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer'}}
                        onClick={() => { setMostrarFormulari(true) }}>
                        + Tasca
                      </button>
                      <button style={{flex:1, padding:'10px', background:'white', color:'#1D9E75', border:'1px solid #1D9E75', borderRadius:'8px', fontSize:'13px', cursor:'pointer'}}
                        onClick={() => { setMostrarHistorial(true) }}>
                        Historial
                      </button>
                      <button style={{padding:'10px 14px', background:'white', color:'#888', border:'1px solid #ddd', borderRadius:'8px', fontSize:'13px', cursor:'pointer'}}
                        onClick={() => setZonaInfo(null)}>
                        ✕
                      </button>
                    </div>
                  </div>
                )}
                {zonesSeleccionades.length > 0 && (
                  <div style={styles.seleccioBar}>
                    <span style={styles.seleccioText}>
                      {resumSeleccio()}
                    </span>
                    <button style={styles.seleccioBoto}
                      onClick={() => setMostrarFormulari(true)}>
                      + Tasca
                    </button>
                    <button style={{...styles.seleccioBoto, ...styles.seleccioBotoSec}}
                      onClick={() => setMostrarHistorial(true)}>
                      Historial
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.centrat}>
                <div style={{textAlign:'center', color:'#aaa'}}>
                  <div style={{fontSize:'48px', marginBottom:'16px'}}>🌱</div>
                  <div style={{fontSize:'16px'}}>Toca el nom del camp dalt per seleccionar-ne un</div>
                </div>
              </div>
            )}
          </div>
        )}

        {pestanya === 'tasca' && (
          <div style={styles.pestanyaCos}>
            {zonesSeleccionades.length > 0 ? (
              <div style={{padding:'16px'}}>
                <div style={styles.grupInfo}>
                  <div style={styles.grupInfoTitol}>Zones seleccionades</div>
                  <div style={styles.grupInfoVal}>{resumSeleccio()}</div>
                </div>
                <button style={styles.boto} onClick={() => setMostrarFormulari(true)}>
                  + Nova tasca
                </button>
                <button style={{...styles.boto, ...styles.botoSec}}
                  onClick={() => setMostrarHistorial(true)}>
                  Veure historial
                </button>
              </div>
            ) : (
              <div style={styles.centrat}>
                <div style={{textAlign:'center', color:'#aaa', padding:'32px'}}>
                  <div style={{fontSize:'40px', marginBottom:'12px'}}>👆</div>
                  <div>Selecciona zones al mapa per afegir tasques</div>
                </div>
              </div>
            )}
          </div>
        )}

        {pestanya === 'config' && (
          <div style={{padding:'16px'}}>
            <div style={styles.seccio}>El meu compte</div>
            <div style={styles.grupInfo}>
              <div style={styles.grupInfoTitol}>Email</div>
              <div style={styles.grupInfoVal}>{usuari?.email}</div>
            </div>
            <button style={{...styles.boto, ...styles.botoSec, marginTop:'12px'}}
              onClick={onTancarSessio}>
              Tancar sessió
            </button>

            <div style={{...styles.seccio, marginTop:'24px'}}>Camp actual</div>
            {campSeleccionat ? (
              <div style={styles.grupInfo}>
                <div style={styles.grupInfoTitol}>Camp seleccionat</div>
                <div style={styles.grupInfoVal}>{pobleSeleccionat?.nom} · {campSeleccionat?.nom}</div>
              </div>
            ) : (
              <div style={{color:'#aaa', fontSize:'14px'}}>Cap camp seleccionat</div>
            )}
          </div>
        )}
      </div>

      {/* Barra de navegació inferior */}
      <div style={styles.navBar}>
        {[
          { id:'mapa', icon:'🗺️', label:'Mapa' },
          { id:'tasca', icon:'✏️', label:'Tasca' },
          { id:'config', icon:'⚙️', label:'Config' },
        ].map(p => (
          <button key={p.id}
            style={{...styles.navBtn, ...(pestanya===p.id?styles.navBtnActiu:{})}}
            onClick={() => setPestanya(p.id)}>
            <span style={{fontSize:'22px'}}>{p.icon}</span>
            <span style={{fontSize:'10px', marginTop:'2px'}}>{p.label}</span>
          </button>
        ))}
      </div>

      {mostrarFormulari && zonesSeleccionades.length > 0 && (
        <FormulariTasca
          zones={zonesSeleccionades}
          camp={campAmbPoble()}
          onTancar={() => setMostrarFormulari(false)}
          onGuardat={() => {
            setMostrarFormulari(false)
            onGuardatTasca()
          }}
        />
      )}

      {mostrarHistorial && zonesSeleccionades.length > 0 && (
        <Historial
          zones={zonesSeleccionades}
          onTancar={() => setMostrarHistorial(false)}
        />
      )}
    </div>
  )
}

const styles = {
  app: { fontFamily:'system-ui,sans-serif', height:'100dvh', display:'flex', flexDirection:'column', background:'#f8f7f4', overflow:'hidden' },
  cap: { background:'#1D9E75', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  capInfo: { flex:1 },
  capTitol: { color:'white', fontWeight:'700', fontSize:'16px' },
  capSub: { color:'rgba(255,255,255,0.85)', fontSize:'13px', marginTop:'2px', cursor:'pointer' },
  botoSortir: { background:'rgba(255,255,255,0.2)', border:'none', color:'white', borderRadius:'8px', padding:'6px 10px', fontSize:'16px', cursor:'pointer' },
  selectorOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'flex-end' },
  selectorModal: { background:'white', width:'100%', borderRadius:'16px 16px 0 0', padding:'20px', maxHeight:'70vh', overflowY:'auto' },
  selectorTitol: { fontSize:'16px', fontWeight:'600', color:'#333', marginBottom:'16px' },
  selectorPoble: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', padding:'8px 0 4px' },
  selectorCamp: { padding:'12px', borderRadius:'8px', fontSize:'15px', color:'#333', cursor:'pointer', marginBottom:'2px' },
  selectorActiu: { background:'#E1F5EE', color:'#0F6E56', fontWeight:'500' },
  contingut: { flex:1, overflow:'hidden', position:'relative' },
  mapaWrap: { height:'100%', display:'flex', flexDirection:'column' },
  pestanyaCos: { height:'100%', overflowY:'auto' },
  seleccioBar: { background:'white', borderTop:'1px solid #eee', padding:'10px 16px', display:'flex', alignItems:'center', gap:'8px', flexShrink:0 },
  seleccioText: { flex:1, fontSize:'13px', fontWeight:'500', color:'#333' },
  seleccioBoto: { padding:'8px 14px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', cursor:'pointer', fontWeight:'500' },
  seleccioBotoSec: { background:'white', color:'#1D9E75', border:'1px solid #1D9E75' },
  navBar: { display:'flex', background:'white', borderTop:'1px solid #eee', flexShrink:0, paddingBottom:'env(safe-area-inset-bottom)' },
  navBtn: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'8px 0', border:'none', background:'transparent', cursor:'pointer', color:'#999' },
  navBtnActiu: { color:'#1D9E75' },
  centrat: { display:'flex', alignItems:'center', justifyContent:'center', height:'100%' },
  seccio: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px' },
  grupInfo: { background:'white', border:'1px solid #eee', borderRadius:'8px', padding:'12px', marginBottom:'8px' },
  grupInfoTitol: { fontSize:'11px', color:'#aaa', marginBottom:'4px' },
  grupInfoVal: { fontSize:'14px', color:'#333', fontWeight:'500' },
  boto: { width:'100%', padding:'14px', background:'#1D9E75', color:'white', border:'none', borderRadius:'10px', fontSize:'15px', fontWeight:'600', cursor:'pointer', marginBottom:'10px' },
  botoSec: { background:'white', color:'#1D9E75', border:'1px solid #1D9E75' },
}
