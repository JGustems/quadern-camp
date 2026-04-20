import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

const ESCALA = 0.2
const AM_FILA = 150  // amplada fila en unitats internes
const AL_FILA = 80   // alçada posició en unitats internes

export default function EditorCamp({ camp, onTancar, onGuardat }) {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('select')
  const [zones, setZones] = useState([])
  const [perimetre, setPerimetre] = useState([])
  const [dibuixantPerimetre, setDibuixantPerimetre] = useState(false)
  const [dibuixantZona, setDibuixantZona] = useState(false)
  const [ptsDibuix, setPtsDibuix] = useState([])
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [dragPt, setDragPt] = useState(null)
  const [dragZona, setDragZona] = useState(null)
  const [guardant, setGuardant] = useState(false)
  const [hint, setHint] = useState('Selecciona un mode per començar')
  const [nomZona, setNomZona] = useState('')
  const [tipusZona, setTipusZona] = useState('cultiu')
  const [colorZona, setColorZona] = useState('#C0DD97')
  const [numFiles, setNumFiles] = useState(6)
  const [numPosicions, setNumPosicions] = useState(6)
  const [filaInici, setFilaInici] = useState(1)

  const COLORS = ['#FAC775','#C0DD97','#9FE1CB','#F5C4B3','#F4C0D1','#B5D4F4','#D3D1C7','#F7C1C1','#EAF3DE','#D4B5F4']

  useEffect(() => { carregaDades() }, [camp])
  useEffect(() => { dibuixa() }, [zones, perimetre, ptsDibuix, zonaSeleccionada, mode])

  async function carregaDades() {
    if (!camp) return
    if (camp.zones_geojson?.points) setPerimetre(camp.zones_geojson.points)
    const { data } = await supabase.from('zones').select('*').eq('camp_id', camp.id).order('codi')
    setZones(data || [])
  }

  function centroid(pts) {
    return { x: pts.reduce((s,p)=>s+p.x,0)/pts.length, y: pts.reduce((s,p)=>s+p.y,0)/pts.length }
  }

  function ptInPoly(px, py, pts) {
    let inside = false
    for (let i=0,j=pts.length-1; i<pts.length; j=i++) {
      const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y
      if (((yi>py)!=(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside
    }
    return inside
  }

  function zonaAPts(zona) {
    if (zona.forma_geojson?.points) return zona.forma_geojson.points
    if (zona.fila) {
      const x0 = zona._x0 || 0
      const y0 = zona._y0 || 0
      const col = zona.fila - 1
      const row = (zona.posicio_inici || 1) - 1
      return [
        {x: x0+col*AM_FILA, y: y0+row*AL_FILA},
        {x: x0+col*AM_FILA+AM_FILA, y: y0+row*AL_FILA},
        {x: x0+col*AM_FILA+AM_FILA, y: y0+row*AL_FILA+AL_FILA},
        {x: x0+col*AM_FILA, y: y0+row*AL_FILA+AL_FILA},
      ]
    }
    return []
  }

  function dibuixa() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.fillStyle = '#f0ede8'
    ctx.fillRect(0,0,canvas.width,canvas.height)

    // Perímetre
    if (perimetre.length > 1) {
      ctx.beginPath()
      perimetre.forEach((p,i) => i===0 ? ctx.moveTo(p.x*ESCALA,p.y*ESCALA) : ctx.lineTo(p.x*ESCALA,p.y*ESCALA))
      ctx.closePath()
      ctx.fillStyle = '#e8e4de'
      ctx.fill()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1.5
      ctx.stroke()
      perimetre.forEach((p,i) => {
        ctx.beginPath()
        ctx.arc(p.x*ESCALA,p.y*ESCALA,4,0,Math.PI*2)
        ctx.fillStyle = mode==='perimetre' ? '#1D9E75' : '#aaa'
        ctx.fill()
      })
    }

    // Zones
    zones.forEach(zona => {
      const pts = zonaAPts(zona)
      if (!pts.length) return
      const sel = zonaSeleccionada?.id === zona.id || zonaSeleccionada?.tempId === zona.tempId
      ctx.beginPath()
      pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x*ESCALA,p.y*ESCALA) : ctx.lineTo(p.x*ESCALA,p.y*ESCALA))
      ctx.closePath()
      ctx.fillStyle = zona.color || '#C0DD97'
      ctx.globalAlpha = 0.7
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = sel ? '#1D9E75' : 'rgba(0,0,0,0.2)'
      ctx.lineWidth = sel ? 2.5 : 0.8
      ctx.stroke()
      const c = centroid(pts)
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.font = `${zona.es_permanent ? 10 : 9}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(zona.nom || zona.codi, c.x*ESCALA, c.y*ESCALA)
      if (sel) {
        pts.forEach(p => {
          ctx.beginPath()
          ctx.arc(p.x*ESCALA,p.y*ESCALA,5,0,Math.PI*2)
          ctx.fillStyle = '#1D9E75'
          ctx.fill()
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 1.5
          ctx.stroke()
        })
      }
    })

    // Dibuix en curs
    if (ptsDibuix.length) {
      ctx.beginPath()
      ptsDibuix.forEach((p,i) => i===0 ? ctx.moveTo(p.x*ESCALA,p.y*ESCALA) : ctx.lineTo(p.x*ESCALA,p.y*ESCALA))
      ctx.strokeStyle = '#1D9E75'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4,3])
      ctx.stroke()
      ctx.setLineDash([])
      ptsDibuix.forEach((p,i) => {
        ctx.beginPath()
        ctx.arc(p.x*ESCALA,p.y*ESCALA,4,0,Math.PI*2)
        ctx.fillStyle = i===0 ? '#1D9E75' : 'white'
        ctx.fill()
        ctx.strokeStyle = '#1D9E75'
        ctx.lineWidth = 1
        ctx.stroke()
      })
    }
  }

  function setModeI(m) {
    setMode(m)
    setDibuixantPerimetre(false)
    setDibuixantZona(false)
    setPtsDibuix([])
    setDragPt(null)
    const hints = {
      select: 'Clica una zona per seleccionar-la i editar-la',
      perimetre: 'Clica per afegir punts al perímetre del camp. Doble clic per tancar',
      zona: 'Clica per dibuixar una zona permanent. Doble clic per tancar',
      files: 'Configura les files i clica "Afegir files" per generar-les automàticament',
      moure: 'Selecciona una zona i arrossega els seus vèrtexs',
    }
    setHint(hints[m] || '')
  }

  function handleCanvasClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / ESCALA
    const y = (e.clientY - rect.top) / ESCALA

    if (mode === 'perimetre') {
      if (!dibuixantPerimetre) setDibuixantPerimetre(true)
      setPtsDibuix(prev => [...prev, {x, y}])
      return
    }

    if (mode === 'zona') {
      if (!dibuixantZona) setDibuixantZona(true)
      setPtsDibuix(prev => [...prev, {x, y}])
      return
    }

    if (mode === 'select' || mode === 'moure') {
      let trobada = null
      for (let i=zones.length-1; i>=0; i--) {
        const pts = zonaAPts(zones[i])
        if (pts.length && ptInPoly(x, y, pts)) { trobada = zones[i]; break }
      }
      setZonaSeleccionada(trobada)
      if (trobada) {
        setNomZona(trobada.nom || trobada.codi || '')
        setTipusZona(trobada.es_permanent ? 'permanent' : 'cultiu')
        setColorZona(trobada.color || '#C0DD97')
      }
    }
  }

  function handleDblClick(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / ESCALA
    const y = (e.clientY - rect.top) / ESCALA

    if (mode === 'perimetre' && ptsDibuix.length >= 3) {
      setPerimetre(ptsDibuix)
      setPtsDibuix([])
      setDibuixantPerimetre(false)
      setHint('Perímetre guardat! Ara pots afegir zones.')
      return
    }

    if (mode === 'zona' && ptsDibuix.length >= 3) {
      const novaZona = {
        tempId: Date.now(),
        camp_id: camp.id,
        codi: nomZona || `Z${zones.length+1}`,
        nom: nomZona || `Zona ${zones.length+1}`,
        tipus: tipusZona,
        es_permanent: tipusZona !== 'cultiu',
        color: colorZona,
        forma_geojson: { type: 'polygon', points: [...ptsDibuix] },
      }
      setZones(prev => [...prev, novaZona])
      setZonaSeleccionada(novaZona)
      setPtsDibuix([])
      setDibuixantZona(false)
      setHint('Zona creada! Pots continuar dibuixant o guardar.')
      return
    }
  }

  function handleMouseDown(e) {
    if (mode !== 'moure' || !zonaSeleccionada) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / ESCALA
    const y = (e.clientY - rect.top) / ESCALA
    const pts = zonaAPts(zonaSeleccionada)
    const idx = pts.findIndex(p => Math.hypot(x-p.x, y-p.y) < 15)
    if (idx >= 0) setDragPt(idx)
  }

  function handleMouseMove(e) {
    if (mode !== 'moure' || dragPt === null || !zonaSeleccionada) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / ESCALA
    const y = (e.clientY - rect.top) / ESCALA
    setZones(prev => prev.map(z => {
      if ((z.id && z.id === zonaSeleccionada.id) || (z.tempId && z.tempId === zonaSeleccionada.tempId)) {
        const pts = zonaAPts(z).map((p,i) => i===dragPt ? {x,y} : p)
        return { ...z, forma_geojson: { type:'polygon', points: pts } }
      }
      return z
    }))
  }

  function handleMouseUp() { setDragPt(null) }

  function afegirFiles() {
    const x0 = perimetre.length ? Math.min(...perimetre.map(p=>p.x)) + 50 : 100
    const y0 = perimetre.length ? Math.min(...perimetre.map(p=>p.y)) + 50 : 100
    const novesZones = []
    for (let col=0; col<numFiles; col++) {
      for (let row=0; row<numPosicions; row++) {
        const fila = filaInici + col
        const pos = row + 1
        const codi = fila*10 + pos
        const jaExisteix = zones.find(z => z.codi === codi.toString() && !z.es_permanent)
        if (!jaExisteix) {
          novesZones.push({
            tempId: Date.now() + col*100 + row,
            camp_id: camp.id,
            codi: codi.toString(),
            nom: codi.toString(),
            tipus: 'cultiu',
            es_permanent: false,
            fila: fila,
            posicio_inici: pos,
            posicio_fi: pos,
            tub_reg: fila,
            amplada_m: 1.5,
            llargada_m: 80,
            color: '#e8e4de',
            _x0: x0,
            _y0: y0,
          })
        }
      }
    }
    setZones(prev => [...prev, ...novesZones])
    setHint(`${novesZones.length} files afegides! Pots moure-les amb el mode "Moure".`)
  }

  function actualitzarZonaSeleccionada() {
    if (!zonaSeleccionada) return
    setZones(prev => prev.map(z => {
      if ((z.id && z.id === zonaSeleccionada.id) || (z.tempId && z.tempId === zonaSeleccionada.tempId)) {
        return {
          ...z,
          nom: nomZona,
          codi: nomZona,
          es_permanent: tipusZona !== 'cultiu',
          color: colorZona,
        }
      }
      return z
    }))
  }

  function eliminarZona() {
    if (!zonaSeleccionada) return
    setZones(prev => prev.filter(z =>
      !(z.id && z.id === zonaSeleccionada.id) && !(z.tempId && z.tempId === zonaSeleccionada.tempId)
    ))
    setZonaSeleccionada(null)
  }

  async function guardar() {
    setGuardant(true)
    // Guardar perímetre al camp
    await supabase.from('camps').update({
      zones_geojson: perimetre.length ? { type:'polygon', points: perimetre } : null
    }).eq('id', camp.id)

    // Esborrar zones antigues i reinserir totes
    await supabase.from('zones').delete().eq('camp_id', camp.id)

    const zonesAGuardar = zones.map(z => ({
      camp_id: camp.id,
      codi: z.codi,
      nom: z.nom,
      tipus: z.tipus || (z.es_permanent ? 'permanent' : 'cultiu'),
      es_permanent: z.es_permanent || false,
      fila: z.fila || null,
      posicio_inici: z.posicio_inici || null,
      posicio_fi: z.posicio_fi || null,
      tub_reg: z.tub_reg || null,
      amplada_m: z.amplada_m || 1.5,
      llargada_m: z.llargada_m || 80,
      forma_geojson: z.forma_geojson || null,
      color: z.color || null,
      notes: z.notes || null,
    }))

    await supabase.from('zones').insert(zonesAGuardar)
    setGuardant(false)
    onGuardat && onGuardat()
    setHint('✅ Guardat correctament!')
  }

  const modeButtons = [
    { id:'select', label:'Seleccionar', icon:'↖' },
    { id:'perimetre', label:'Perímetre', icon:'⬡' },
    { id:'zona', label:'Zona lliure', icon:'✏️' },
    { id:'files', label:'Afegir files', icon:'⊞' },
    { id:'moure', label:'Moure punt', icon:'⤢' },
  ]

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div>
            <div style={styles.titol}>Editor de zones — {camp?.nom}</div>
            <div style={styles.hint}>{hint}</div>
          </div>
          <button style={styles.botoTancar} onClick={onTancar}>✕</button>
        </div>

        <div style={styles.cos}>
          <div style={styles.toolbar}>
            {modeButtons.map(b => (
              <button key={b.id}
                style={{...styles.modeBtn, ...(mode===b.id ? styles.modeBtnActiu : {})}}
                onClick={() => setModeI(b.id)}>
                <span>{b.icon}</span>
                <span style={{fontSize:'11px'}}>{b.label}</span>
              </button>
            ))}
            <div style={{flex:1}}/>
            <button style={styles.botoGuardar} onClick={guardar} disabled={guardant}>
              {guardant ? 'Guardant...' : '💾 Guardar'}
            </button>
          </div>

          <div style={styles.editorArea}>
            <canvas
              ref={canvasRef}
              width={900}
              height={600}
              onClick={handleCanvasClick}
              onDoubleClick={handleDblClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{cursor: mode==='moure'?'crosshair':'pointer', display:'block'}}
            />

            <div style={styles.panell}>
              {mode === 'files' && (
                <div>
                  <div style={styles.seccio}>Afegir files estàndard</div>
                  <div style={styles.grup}>
                    <label style={styles.label}>Fila inicial</label>
                    <input type="number" style={styles.input} value={filaInici}
                      onChange={e => setFilaInici(parseInt(e.target.value)||1)} min="1"/>
                  </div>
                  <div style={styles.grup}>
                    <label style={styles.label}>Nombre de files</label>
                    <input type="number" style={styles.input} value={numFiles}
                      onChange={e => setNumFiles(parseInt(e.target.value)||1)} min="1" max="20"/>
                  </div>
                  <div style={styles.grup}>
                    <label style={styles.label}>Posicions per fila</label>
                    <input type="number" style={styles.input} value={numPosicions}
                      onChange={e => setNumPosicions(parseInt(e.target.value)||1)} min="1" max="12"/>
                  </div>
                  <button style={styles.botoPrimari} onClick={afegirFiles}>
                    ⊞ Afegir files
                  </button>
                  <div style={{fontSize:'11px', color:'#aaa', marginTop:'8px'}}>
                    Generarà files {filaInici} a {filaInici+numFiles-1}, posicions 1 a {numPosicions}
                  </div>
                </div>
              )}

              {(mode === 'zona' || mode === 'select' || mode === 'moure') && (
                <div>
                  <div style={styles.seccio}>
                    {zonaSeleccionada ? 'Zona seleccionada' : 'Nova zona'}
                  </div>
                  <div style={styles.grup}>
                    <label style={styles.label}>Nom / Codi</label>
                    <input type="text" style={styles.input} value={nomZona}
                      onChange={e => setNomZona(e.target.value)}
                      placeholder="ex: Caseta, Caminal..."/>
                  </div>
                  <div style={styles.grup}>
                    <label style={styles.label}>Tipus</label>
                    <select style={styles.input} value={tipusZona}
                      onChange={e => setTipusZona(e.target.value)}>
                      <option value="cultiu">Cultiu</option>
                      <option value="permanent">Permanent</option>
                      <option value="caminal">Caminal</option>
                      <option value="altres">Altres</option>
                    </select>
                  </div>
                  <div style={styles.grup}>
                    <label style={styles.label}>Color</label>
                    <div style={{display:'flex', flexWrap:'wrap', gap:'4px'}}>
                      {COLORS.map(c => (
                        <div key={c}
                          onClick={() => setColorZona(c)}
                          style={{width:'20px', height:'20px', borderRadius:'4px', background:c,
                            border: colorZona===c ? '2px solid #1D9E75' : '1px solid rgba(0,0,0,0.2)',
                            cursor:'pointer'}}/>
                      ))}
                    </div>
                  </div>
                  {zonaSeleccionada && <>
                    <button style={styles.botoPrimari} onClick={actualitzarZonaSeleccionada}>
                      Actualitzar zona
                    </button>
                    <button style={{...styles.botoPrimari, background:'#e55', marginTop:'6px'}}
                      onClick={eliminarZona}>
                      Eliminar zona
                    </button>
                  </>}
                </div>
              )}

              <div style={{marginTop:'16px'}}>
                <div style={styles.seccio}>Zones ({zones.length})</div>
                <div style={{maxHeight:'200px', overflowY:'auto'}}>
                  {zones.map((z,i) => (
                    <div key={z.id||z.tempId}
                      onClick={() => {
                        setZonaSeleccionada(z)
                        setNomZona(z.nom||z.codi||'')
                        setTipusZona(z.es_permanent?'permanent':'cultiu')
                        setColorZona(z.color||'#C0DD97')
                      }}
                      style={{display:'flex', alignItems:'center', gap:'6px', padding:'4px 0',
                        borderBottom:'0.5px solid #eee', cursor:'pointer',
                        background: (zonaSeleccionada?.id===z.id||zonaSeleccionada?.tempId===z.tempId)?'#E1F5EE':'transparent'}}>
                      <div style={{width:'10px', height:'10px', borderRadius:'2px',
                        background:z.color||'#ddd', flexShrink:0}}/>
                      <span style={{fontSize:'12px', color:'#333'}}>{z.nom||z.codi}</span>
                      <span style={{fontSize:'10px', color:'#aaa', marginLeft:'auto'}}>
                        {z.es_permanent?'perm':'cultiu'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', width:'min(1100px, 98vw)', height:'90vh', display:'flex', flexDirection:'column' },
  cap: { padding:'14px 20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 },
  titol: { fontSize:'16px', fontWeight:'600', color:'#333' },
  hint: { fontSize:'12px', color:'#888', marginTop:'3px' },
  botoTancar: { background:'none', border:'none', fontSize:'18px', cursor:'pointer', color:'#999' },
  cos: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  toolbar: { display:'flex', gap:'6px', padding:'10px 16px', borderBottom:'1px solid #eee', flexShrink:0, flexWrap:'wrap' },
  modeBtn: { display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', padding:'6px 12px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', background:'white', color:'#666', minWidth:'70px' },
  modeBtnActiu: { background:'#1D9E75', color:'white', borderColor:'#1D9E75' },
  botoGuardar: { padding:'8px 20px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'500' },
  editorArea: { flex:1, display:'flex', overflow:'hidden' },
  panell: { width:'220px', borderLeft:'1px solid #eee', padding:'14px', overflowY:'auto', flexShrink:0 },
  seccio: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px' },
  grup: { marginBottom:'10px' },
  label: { display:'block', fontSize:'11px', color:'#888', marginBottom:'4px' },
  input: { width:'100%', padding:'7px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' },
  botoPrimari: { width:'100%', padding:'8px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', marginTop:'4px' },
}
