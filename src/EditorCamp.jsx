import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

const AM_FILA = 150
const AL_FILA = 80

export default function EditorCamp({ camp, onTancar, onGuardat }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 })
  const [mode, setMode] = useState('select')
  const [zones, setZones] = useState([])
  const [perimetre, setPerimetre] = useState([])
  const [ptsDibuix, setPtsDibuix] = useState([])
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [dragPt, setDragPt] = useState(null)
  const [dragTarget, setDragTarget] = useState(null)
  const [guardant, setGuardant] = useState(false)
  const [nomZona, setNomZona] = useState('')
  const [tipusZona, setTipusZona] = useState('permanent')
  const [colorZona, setColorZona] = useState('#C0DD97')
  const [numFiles, setNumFiles] = useState(6)
  const [numPosicions, setNumPosicions] = useState(6)
  const [filaInici, setFilaInici] = useState(1)
  const [x0Files, setX0Files] = useState(100)
  const [y0Files, setY0Files] = useState(100)
  const [mousePosReal, setMousePosReal] = useState(null)

  const COLORS = ['#FAC775','#C0DD97','#9FE1CB','#F5C4B3','#F4C0D1','#B5D4F4','#D3D1C7','#F7C1C1','#EAF3DE','#D4B5F4']

  const hints = {
    select: 'Clica una zona per seleccionar-la',
    perimetre: 'Clica per afegir punts al perímetre · "Tancar perímetre" per acabar',
    zona: 'Clica per dibuixar una zona · "Tancar zona" per acabar (mínim 3 punts)',
    files: 'Configura les files i clica "Afegir files"',
    moure: 'Arrossega els punts grocs per moure\'ls',
  }

  useEffect(() => {
    carregaDades()
    actualitzaMida()
    window.addEventListener('resize', actualitzaMida)
    return () => window.removeEventListener('resize', actualitzaMida)
  }, [camp])

  useEffect(() => { dibuixa() }, [zones, perimetre, ptsDibuix, zonaSeleccionada, mode, canvasSize])

  function actualitzaMida() {
    if (!containerRef.current) return
    const r = containerRef.current.getBoundingClientRect()
    setCanvasSize({ w: Math.floor(r.width), h: Math.floor(r.height) })
  }

  async function carregaDades() {
    if (!camp) return
    if (camp.zones_geojson?.points) setPerimetre(camp.zones_geojson.points)
    const { data } = await supabase.from('zones').select('*').eq('camp_id', camp.id).order('codi')
    setZones(data || [])
  }

  function getPts(zona) {
    if (zona.forma_geojson?.points) return zona.forma_geojson.points
    if (zona.fila != null) {
      const x0 = zona._x0 ?? 100
      const y0 = zona._y0 ?? 100
      const col = zona.fila - 1
      const row = (zona.posicio_inici ?? 1) - 1
      return [
        {x: x0+col*AM_FILA,        y: y0+row*AL_FILA},
        {x: x0+col*AM_FILA+AM_FILA,y: y0+row*AL_FILA},
        {x: x0+col*AM_FILA+AM_FILA,y: y0+row*AL_FILA+AL_FILA},
        {x: x0+col*AM_FILA,        y: y0+row*AL_FILA+AL_FILA},
      ]
    }
    return []
  }

  function bbox() {
    const tots = [...perimetre, ...zones.flatMap(z => getPts(z))]
    if (!tots.length) return { minX:0, minY:0, maxX:1000, maxY:700 }
    return {
      minX: Math.min(...tots.map(p=>p.x)) - 50,
      minY: Math.min(...tots.map(p=>p.y)) - 50,
      maxX: Math.max(...tots.map(p=>p.x)) + 50,
      maxY: Math.max(...tots.map(p=>p.y)) + 50,
    }
  }

  function escala() {
    const b = bbox()
    const sx = canvasSize.w / (b.maxX - b.minX)
    const sy = canvasSize.h / (b.maxY - b.minY)
    return { s: Math.min(sx, sy, 1), b }
  }

  function toCanvas(x, y) {
    const { s, b } = escala()
    return { cx: (x - b.minX) * s, cy: (y - b.minY) * s }
  }

  function fromCanvas(cx, cy) {
    const { s, b } = escala()
    return { x: cx / s + b.minX, y: cy / s + b.minY }
  }

  function getCanvasPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const cx = (e.clientX - rect.left) * scaleX
    const cy = (e.clientY - rect.top) * scaleY
    return fromCanvas(cx, cy)
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

  function dibuixa() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.fillStyle = '#f0ede8'
    ctx.fillRect(0,0,canvas.width,canvas.height)

    // Grid lleuger
    ctx.strokeStyle = 'rgba(0,0,0,0.05)'
    ctx.lineWidth = 1
    for (let x=0; x<canvas.width; x+=50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke() }
    for (let y=0; y<canvas.height; y+=50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke() }

    // Perímetre
    if (perimetre.length > 1) {
      ctx.beginPath()
      perimetre.forEach((p,i) => {
        const {cx,cy} = toCanvas(p.x,p.y)
        i===0 ? ctx.moveTo(cx,cy) : ctx.lineTo(cx,cy)
      })
      ctx.closePath()
      ctx.fillStyle = '#e8e4de'
      ctx.fill()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Zones
    zones.forEach(zona => {
      const pts = getPts(zona)
      if (!pts.length) return
      const sel = zonaSeleccionada && (zonaSeleccionada.id === zona.id || zonaSeleccionada.tempId === zona.tempId)
      ctx.beginPath()
      pts.forEach((p,i) => {
        const {cx,cy} = toCanvas(p.x,p.y)
        i===0 ? ctx.moveTo(cx,cy) : ctx.lineTo(cx,cy)
      })
      ctx.closePath()
      ctx.fillStyle = zona.color || '#C0DD97'
      ctx.globalAlpha = 0.75
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = sel ? '#1D9E75' : 'rgba(0,0,0,0.2)'
      ctx.lineWidth = sel ? 2.5 : 0.8
      ctx.stroke()
      const c = centroid(pts)
      const {cx,cy} = toCanvas(c.x,c.y)
      ctx.fillStyle = 'rgba(0,0,0,0.75)'
      ctx.font = '11px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(zona.nom || zona.codi, cx, cy)
      if (sel) {
        pts.forEach(p => {
          const {cx,cy} = toCanvas(p.x,p.y)
          ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2)
          ctx.fillStyle = '#FFD700'; ctx.fill()
          ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke()
        })
      }
    })

    // Dibuix en curs
    if (ptsDibuix.length) {
      ctx.beginPath()
      ptsDibuix.forEach((p,i) => {
        const {cx,cy} = toCanvas(p.x,p.y)
        i===0 ? ctx.moveTo(cx,cy) : ctx.lineTo(cx,cy)
      })
      ctx.strokeStyle = '#1D9E75'
      ctx.lineWidth = 2
      ctx.setLineDash([5,4])
      ctx.stroke()
      ctx.setLineDash([])
      ptsDibuix.forEach((p,i) => {
        const {cx,cy} = toCanvas(p.x,p.y)
        ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2)
        ctx.fillStyle = i===0 ? '#1D9E75' : 'white'
        ctx.fill()
        ctx.strokeStyle = '#1D9E75'; ctx.lineWidth = 1.5; ctx.stroke()
      })
    }

    // Punts del perímetre
    if (mode === 'perimetre' || mode === 'moure') {
      perimetre.forEach((p,i) => {
        const {cx,cy} = toCanvas(p.x,p.y)
        ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2)
        ctx.fillStyle = '#1D9E75'; ctx.fill()
        ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke()
      })
    }
  }

  function handleClick(e) {
    const {x, y} = getCanvasPos(e)

    if (mode === 'perimetre') {
      setPtsDibuix(prev => [...prev, {x, y}])
      return
    }
    if (mode === 'zona') {
      setPtsDibuix(prev => [...prev, {x, y}])
      return
    }
    if (mode === 'select') {
      let trobada = null
      for (let i=zones.length-1; i>=0; i--) {
        const pts = getPts(zones[i])
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

  function tancarPerimetre() {
    if (ptsDibuix.length < 3) return
    setPerimetre(ptsDibuix)
    setPtsDibuix([])
  }

  function tancarZona() {
    if (ptsDibuix.length < 3) return
    const novaZona = {
      tempId: Date.now(),
      camp_id: camp.id,
      codi: nomZona || `Z${zones.length+1}`,
      nom: nomZona || `Zona ${zones.length+1}`,
      tipus: tipusZona,
      es_permanent: tipusZona !== 'cultiu',
      color: colorZona,
      forma_geojson: { type:'polygon', points: [...ptsDibuix] },
    }
    setZones(prev => [...prev, novaZona])
    setZonaSeleccionada(novaZona)
    setPtsDibuix([])
  }

  function handleMouseDown(e) {
    if (mode !== 'moure') return
    const {x, y} = getCanvasPos(e)
    const RADI = 15

    // Buscar punt del perímetre
    for (let i=0; i<perimetre.length; i++) {
      if (Math.hypot(x-perimetre[i].x, y-perimetre[i].y) < RADI) {
        setDragTarget('perimetre')
        setDragPt(i)
        return
      }
    }
    // Buscar punt de zona seleccionada
    if (zonaSeleccionada) {
      const pts = getPts(zonaSeleccionada)
      for (let i=0; i<pts.length; i++) {
        if (Math.hypot(x-pts[i].x, y-pts[i].y) < RADI) {
          setDragTarget('zona')
          setDragPt(i)
          return
        }
      }
    }
  }

  function handleMouseMove(e) {
    const {x, y} = getCanvasPos(e)
    
    // Mostrar posició real
    const mX = (x / 100).toFixed(2)
    const mY = (y / 100).toFixed(2)
    let info = `X: ${mX}m  Y: ${mY}m`
    
    if (ptsDibuix.length > 0) {
      const ultim = ptsDibuix[ptsDibuix.length - 1]
      const dist = Math.hypot(x - ultim.x, y - ultim.y)
      const distM = (dist / 100).toFixed(2)
      info += `  |  Des de l'últim punt: ${distM}m`
    }
    setMousePosReal(info)

    // Moure punts
    if (dragPt === null) return
    if (dragTarget === 'perimetre') {
      setPerimetre(prev => prev.map((p,i) => i===dragPt ? {x,y} : p))
    } else if (dragTarget === 'zona' && zonaSeleccionada) {
      setZones(prev => prev.map(z => {
        if ((z.id && z.id===zonaSeleccionada.id)||(z.tempId && z.tempId===zonaSeleccionada.tempId)) {
          const pts = getPts(z).map((p,i) => i===dragPt ? {x,y} : p)
          return {...z, forma_geojson:{type:'polygon', points:pts}}
        }
        return z
      }))
    }
  }

  function handleMouseUp() { setDragPt(null); setDragTarget(null) }

  function afegirFiles() {
    const novesZones = []
    for (let col=0; col<numFiles; col++) {
      for (let row=0; row<numPosicions; row++) {
        const fila = filaInici + col
        const pos = row + 1
        const codi = (fila*10 + pos).toString()
        if (!zones.find(z => z.codi===codi && !z.es_permanent)) {
          novesZones.push({
            tempId: Date.now()+col*100+row,
            camp_id: camp.id,
            codi,
            nom: codi,
            tipus: 'cultiu',
            es_permanent: false,
            fila,
            posicio_inici: pos,
            posicio_fi: pos,
            tub_reg: fila,
            amplada_m: 1.5,
            llargada_m: 80,
            color: '#e8e4de',
            _x0: x0Files,
            _y0: y0Files,
          })
        }
      }
    }
    setZones(prev => [...prev, ...novesZones])
  }

  function actualitzarZona() {
    if (!zonaSeleccionada) return
    setZones(prev => prev.map(z => {
      if ((z.id && z.id===zonaSeleccionada.id)||(z.tempId && z.tempId===zonaSeleccionada.tempId)) {
        return {...z, nom:nomZona, codi:nomZona, es_permanent:tipusZona!=='cultiu', color:colorZona}
      }
      return z
    }))
  }

  function eliminarZona() {
    setZones(prev => prev.filter(z =>
      !(z.id && z.id===zonaSeleccionada.id) && !(z.tempId && z.tempId===zonaSeleccionada.tempId)
    ))
    setZonaSeleccionada(null)
  }

  async function guardar() {
    setGuardant(true)
    const geojson = perimetre.length >= 3 ? {type:'polygon', points:perimetre} : null
    console.log('Guardant perímetre:', geojson)
    const { error } = await supabase.from('camps')
      .update({ zones_geojson: geojson })
      .eq('id', camp.id)
    console.log('Error perímetre:', error)

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
    }))
    if (zonesAGuardar.length) await supabase.from('zones').insert(zonesAGuardar)
    setGuardant(false)
    onGuardat && onGuardat()
  }
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.cap}>
          <div style={{flex:1}}>
            <div style={styles.titol}>Editor — {camp?.nom}</div>
            <div style={styles.hint}>{hints[mode]}</div>
          </div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <button style={styles.botoGuardar} onClick={guardar} disabled={guardant}>
              {guardant ? 'Guardant...' : '💾 Guardar tot'}
            </button>
            <button style={styles.botoTancar} onClick={onTancar}>✕</button>
          </div>
        </div>

        <div style={styles.toolbar}>
          {[
            {id:'select', label:'Seleccionar', icon:'↖'},
            {id:'perimetre', label:'Perímetre', icon:'⬡'},
            {id:'zona', label:'Zona lliure', icon:'✏️'},
            {id:'files', label:'Afegir files', icon:'⊞'},
            {id:'moure', label:'Moure punts', icon:'⤢'},
          ].map(b => (
            <button key={b.id}
              style={{...styles.modeBtn, ...(mode===b.id?styles.modeBtnActiu:{})}}
              onClick={() => { setMode(b.id); setPtsDibuix([]) }}>
              {b.icon} {b.label}
            </button>
          ))}

          {mode === 'perimetre' && ptsDibuix.length >= 3 && (
            <button style={styles.botoAccio} onClick={tancarPerimetre}>
              ✅ Tancar perímetre
            </button>
          )}
          {mode === 'zona' && ptsDibuix.length >= 3 && (
            <button style={styles.botoAccio} onClick={tancarZona}>
              ✅ Tancar zona
            </button>
          )}
          {ptsDibuix.length > 0 && (
            <button style={{...styles.botoAccio, background:'#e55'}} onClick={() => setPtsDibuix([])}>
              ✕ Cancel·lar
            </button>
          )}
        </div>

        <div style={styles.cos}>
          <div ref={containerRef} style={styles.canvasWrap}>
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{width:'100%', height:'100%', cursor: mode==='moure'?'crosshair':'pointer', display:'block'}}
            />
            {mousePosReal && (
              <div style={{
                position:'absolute', bottom:'8px', left:'8px',
                background:'rgba(0,0,0,0.7)', color:'white',
                padding:'5px 10px', borderRadius:'6px', fontSize:'12px',
                fontFamily:'monospace', pointerEvents:'none'
              }}>
                {mousePosReal}
              </div>
            )}
          </div>

          <div style={styles.panell}>
            {mode === 'files' && (
              <div>
                <div style={styles.seccio}>Files estàndard (1,5m × 80m)</div>
                <div style={styles.grup}>
                  <label style={styles.label}>Fila inicial</label>
                  <input type="number" style={styles.input} value={filaInici} min="1"
                    onChange={e => setFilaInici(parseInt(e.target.value)||1)}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Nombre de files</label>
                  <input type="number" style={styles.input} value={numFiles} min="1" max="20"
                    onChange={e => setNumFiles(parseInt(e.target.value)||1)}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Posicions per fila</label>
                  <input type="number" style={styles.input} value={numPosicions} min="1" max="12"
                    onChange={e => setNumPosicions(parseInt(e.target.value)||1)}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Posició X inici</label>
                  <input type="number" style={styles.input} value={x0Files}
                    onChange={e => setX0Files(parseInt(e.target.value)||0)}/>
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Posició Y inici</label>
                  <input type="number" style={styles.input} value={y0Files}
                    onChange={e => setY0Files(parseInt(e.target.value)||0)}/>
                </div>
                <button style={styles.botoPrimari} onClick={afegirFiles}>
                  ⊞ Afegir files
                </button>
                <div style={{fontSize:'11px', color:'#aaa', marginTop:'6px'}}>
                  Files {filaInici}–{filaInici+numFiles-1}, posicions 1–{numPosicions}
                </div>
              </div>
            )}

            {(mode !== 'files') && (
              <div>
                <div style={styles.seccio}>
                  {zonaSeleccionada ? 'Zona seleccionada' : 'Propietats nova zona'}
                </div>
                <div style={styles.grup}>
                  <label style={styles.label}>Nom</label>
                  <input type="text" style={styles.input} value={nomZona}
                    onChange={e => setNomZona(e.target.value)} placeholder="ex: Caseta"/>
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
                      <div key={c} onClick={() => setColorZona(c)}
                        style={{width:'22px', height:'22px', borderRadius:'4px', background:c,
                          border: colorZona===c?'2.5px solid #1D9E75':'1px solid rgba(0,0,0,0.2)',
                          cursor:'pointer'}}/>
                    ))}
                  </div>
                </div>
                {zonaSeleccionada && (
                  <>
                    <button style={styles.botoPrimari} onClick={actualitzarZona}>
                      Actualitzar zona
                    </button>
                    <button style={{...styles.botoPrimari, background:'#e55', marginTop:'6px'}}
                      onClick={eliminarZona}>
                      Eliminar zona
                    </button>
                  </>
                )}
              </div>
            )}

            <div style={{marginTop:'16px'}}>
              <div style={styles.seccio}>Zones ({zones.length})</div>
              <div style={{maxHeight:'180px', overflowY:'auto'}}>
                {zones.map(z => (
                  <div key={z.id||z.tempId}
                    onClick={() => {
                      setZonaSeleccionada(z)
                      setNomZona(z.nom||z.codi||'')
                      setTipusZona(z.es_permanent?'permanent':'cultiu')
                      setColorZona(z.color||'#C0DD97')
                      setMode('select')
                    }}
                    style={{display:'flex', alignItems:'center', gap:'6px', padding:'4px 0',
                      borderBottom:'0.5px solid #eee', cursor:'pointer',
                      background:(zonaSeleccionada?.id===z.id||zonaSeleccionada?.tempId===z.tempId)?'#E1F5EE':'transparent'}}>
                    <div style={{width:'10px',height:'10px',borderRadius:'2px',background:z.color||'#ddd',flexShrink:0}}/>
                    <span style={{fontSize:'12px',color:'#333'}}>{z.nom||z.codi}</span>
                    <span style={{fontSize:'10px',color:'#aaa',marginLeft:'auto'}}>{z.es_permanent?'perm':'cultiu'}</span>
                  </div>
                ))}
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
  modal: { background:'white', borderRadius:'12px', width:'99vw', height:'97vh', display:'flex', flexDirection:'column', overflow:'hidden' },
  cap: { padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:'12px', flexShrink:0 },
  titol: { fontSize:'15px', fontWeight:'600', color:'#333' },
  hint: { fontSize:'12px', color:'#888', marginTop:'2px' },
  botoTancar: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#999', padding:'0 4px' },
  toolbar: { display:'flex', gap:'6px', padding:'8px 12px', borderBottom:'1px solid #eee', flexShrink:0, flexWrap:'wrap', alignItems:'center' },
  modeBtn: { padding:'6px 12px', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', background:'white', color:'#666', fontSize:'13px' },
  modeBtnActiu: { background:'#1D9E75', color:'white', borderColor:'#1D9E75', fontWeight:'500' },
  botoAccio: { padding:'6px 14px', border:'none', borderRadius:'8px', cursor:'pointer', background:'#1D9E75', color:'white', fontSize:'13px', fontWeight:'500' },
  botoGuardar: { padding:'7px 18px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'500', fontSize:'13px' },
  cos: { flex:1, display:'flex', overflow:'hidden' },
  canvasWrap: { flex:1, overflow:'hidden', position:'relative' },
  panell: { width:'210px', borderLeft:'1px solid #eee', padding:'12px', overflowY:'auto', flexShrink:0 },
  seccio: { fontSize:'11px', fontWeight:'600', color:'#999', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' },
  grup: { marginBottom:'8px' },
  label: { display:'block', fontSize:'11px', color:'#888', marginBottom:'3px' },
  input: { width:'100%', padding:'6px 8px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box' },
  botoPrimari: { width:'100%', padding:'8px', background:'#1D9E75', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px' },
}
