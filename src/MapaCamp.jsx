import { useState, useRef } from 'react'

export default function MapaCamp({ camp, zones, zonesSeleccionades, onToggleZona, cultiusActius, dataConsulta, onCanviaData, modeMovil }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [viewBox, setViewBox] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [lastPos, setLastPos] = useState(null)
  const lastTouch = useRef(null)
  const lastDist = useRef(null)

  function getPts(zona) {
    if (zona.forma_geojson?.points) return zona.forma_geojson.points
    return []
  }

  function calcularBbox() {
    const tots = []
    if (camp.zones_geojson?.points) tots.push(...camp.zones_geojson.points)
    zones.forEach(z => tots.push(...getPts(z)))
    if (!tots.length) return { minX:0, minY:0, w:1000, h:700 }
    const minX = Math.min(...tots.map(p=>p.x)) - 40
    const minY = Math.min(...tots.map(p=>p.y)) - 40
    const maxX = Math.max(...tots.map(p=>p.x)) + 40
    const maxY = Math.max(...tots.map(p=>p.y)) + 40
    return { minX, minY, w: maxX-minX, h: maxY-minY }
  }

  function ptsToString(pts) {
    return pts.map(p => `${p.x},${p.y}`).join(' ')
  }

  function centroid(pts) {
    return { x: pts.reduce((s,p)=>s+p.x,0)/pts.length, y: pts.reduce((s,p)=>s+p.y,0)/pts.length }
  }

  function colorZona(zona, cultiusZona, sel) {
    if (sel) return '#B5D4F4'
    if (!cultiusZona || cultiusZona.length === 0) return zona.color || '#e8e4de'
    return cultiusZona[0].color || '#C0DD97'
  }

  function cultiusUnics() {
    const vistos = {}
    Object.values(cultiusActius).forEach(arr => {
      const llista = arr?.tots || (Array.isArray(arr) ? arr : [])
      llista.forEach(c => { if (c.nom && !vistos[c.nom]) vistos[c.nom] = c.color })
    })
    return vistos
  }

  const bbox = calcularBbox()
  const vb = viewBox || `${bbox.minX} ${bbox.minY} ${bbox.w} ${bbox.h}`
  const llegenda = cultiusUnics()

  // Zoom i drag ratolí
  function handleWheel(e) {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const [vbX, vbY, vbW, vbH] = vb.split(' ').map(Number)
    const factor = e.deltaY > 0 ? 1.1 : 0.9
    const mx = vbX + (e.clientX - rect.left) / rect.width * vbW
    const my = vbY + (e.clientY - rect.top) / rect.height * vbH
    const novaW = vbW * factor
    const novaH = vbH * factor
    const novaX = mx - (mx - vbX) * factor
    const novaY = my - (my - vbY) * factor
    setViewBox(`${novaX} ${novaY} ${novaW} ${novaH}`)
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return
    setDragging(true)
    setLastPos({ x: e.clientX, y: e.clientY })
  }

  function handleMouseMove(e) {
    if (dragging && lastPos) {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const [,, vbW, vbH] = vb.split(' ').map(Number)
      const dx = -(e.clientX - lastPos.x) / rect.width * vbW
      const dy = -(e.clientY - lastPos.y) / rect.height * vbH
      const parts = vb.split(' ').map(Number)
      setViewBox(`${parts[0]+dx} ${parts[1]+dy} ${parts[2]} ${parts[3]}`)
      setLastPos({ x: e.clientX, y: e.clientY })
    }
  }

  function handleMouseUp() { setDragging(false); setLastPos(null) }

  // Touch events mòbil
  function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx*dx + dy*dy)
  }

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      lastDist.current = null
    } else if (e.touches.length === 2) {
      lastDist.current = getTouchDist(e.touches)
      lastTouch.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    }
  }

  function handleTouchMove(e) {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const parts = vb.split(' ').map(Number)
    const [vbX, vbY, vbW, vbH] = parts

    if (e.touches.length === 1 && lastTouch.current && !lastDist.current) {
      const dx = -(e.touches[0].clientX - lastTouch.current.x) / rect.width * vbW
      const dy = -(e.touches[0].clientY - lastTouch.current.y) / rect.height * vbH
      setViewBox(`${vbX+dx} ${vbY+dy} ${vbW} ${vbH}`)
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }

    } else if (e.touches.length === 2 && lastDist.current !== null) {
      const novaDist = getTouchDist(e.touches)
      const ratio = lastDist.current / novaDist // invers per zoom
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const dx = -(cx - lastTouch.current.x) / rect.width * vbW
      const dy = -(cy - lastTouch.current.y) / rect.height * vbH

      // Punt de zoom en coordenades SVG
      const svgCx = vbX + (cx - rect.left) / rect.width * vbW
      const svgCy = vbY + (cy - rect.top) / rect.height * vbH

      const novaW = Math.min(Math.max(vbW * ratio, bbox.w * 0.1), bbox.w * 5)
      const novaH = Math.min(Math.max(vbH * ratio, bbox.h * 0.1), bbox.h * 5)
      const novaX = svgCx - (svgCx - vbX) * ratio + dx
      const novaY = svgCy - (svgCy - vbY) * ratio + dy

      setViewBox(`${novaX} ${novaY} ${novaW} ${novaH}`)
      lastDist.current = novaDist
      lastTouch.current = { x: cx, y: cy }
    }
  }

  function handleTouchEnd() {
    lastTouch.current = null
    lastDist.current = null
  }

  function resetZoom() {
    setViewBox(null)
  }

  // Calcular mida del text en funció del viewBox actual
  function midaText(pts) {
    const parts = vb.split(' ').map(Number)
    const vbW = parts[2]
    const amplada = (Math.max(...pts.map(p=>p.x)) - Math.min(...pts.map(p=>p.x)))
    const ratio = amplada / vbW
    return Math.min(Math.max(amplada * 0.12, 8), 40)
  }

  return (
    <div style={{width:'100%', height:'100%', display:'flex', flexDirection:'column', padding: modeMovil?'0':'16px', overflow:'hidden', position:'relative'}}>
      {!modeMovil && (
        <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px', flexWrap:'wrap', flexShrink:0}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <label style={{fontSize:'12px', color:'#888', fontWeight:'500'}}>Veure estat del:</label>
            <input type="date" value={dataConsulta || ''}
              onChange={e => { const val=e.target.value; if(val&&val.length===10) onCanviaData&&onCanviaData(val); else if(!val) onCanviaData&&onCanviaData('') }}
              onBlur={e => { if(e.target.value.length===10&&typeof onCanviaData==='function') onCanviaData(e.target.value) }}
              style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px'}}/>
            {dataConsulta && (
              <button onClick={() => onCanviaData&&onCanviaData('')}
                style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'12px', color:'#666', background:'white', cursor:'pointer'}}>
                Avui
              </button>
            )}
            <button onClick={resetZoom}
              style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'12px', color:'#666', background:'white', cursor:'pointer'}}>
              ↺ Reset zoom
            </button>
          </div>
          {Object.keys(llegenda).length > 0 && (
            <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
              {Object.entries(llegenda).map(([nom, color]) => (
                <div key={nom} style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'#555'}}>
                  <div style={{width:'12px', height:'12px', borderRadius:'3px', background:color, border:'1px solid rgba(0,0,0,0.1)'}}/>
                  {nom}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modeMovil && (
        <div style={{position:'absolute', top:'8px', left:'8px', right:'8px', display:'flex', justifyContent:'space-between', zIndex:5, pointerEvents:'none'}}>
          <input type="date" value={dataConsulta || ''}
            onChange={e => { const val=e.target.value; if(val&&val.length===10) onCanviaData&&onCanviaData(val); else if(!val) onCanviaData&&onCanviaData('') }}
            style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', background:'rgba(255,255,255,0.95)', pointerEvents:'all'}}/>
          {viewBox && (
            <button onClick={resetZoom}
              style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'12px', background:'rgba(255,255,255,0.95)', cursor:'pointer', pointerEvents:'all'}}>
              ↺
            </button>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={vb}
        style={{
          flex:1, width:'100%',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setTooltip(null) }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Fons del camp */}
        {camp.zones_geojson?.points && (
          <polygon
            points={ptsToString(camp.zones_geojson.points)}
            fill="#f0ede8"
            stroke="#ccc"
            strokeWidth="3"
          />
        )}

        {/* Zones ordenades */}
        {[...zones].sort((a,b) => (a.ordre||0)-(b.ordre||0)).map(zona => {
          const pts = getPts(zona)
          if (!pts.length) return null
          const sel = zonesSeleccionades.some(z => z.id === zona.id)
          const cultiusZona = cultiusActius[zona.id] || []
          const c = centroid(pts)
          const nomPos = zona.nom_posicio || c
          const amplada = Math.max(...pts.map(p=>p.x)) - Math.min(...pts.map(p=>p.x))
          const mida = Math.min(Math.max(amplada * 0.12, 8), 40)

          return (
            <g key={zona.id}
              onClick={() => onToggleZona(zona)}
              onMouseEnter={e => {
                if (modeMovil) return
                const tots = cultiusZona.tots || cultiusZona
                setTooltip({ x: e.clientX, y: e.clientY, zona: zona.codi, cultius: tots })
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{cursor:'pointer'}}>

              {/* Zona amb 2 cultius — diagonal */}
              {cultiusZona.length === 2 && !sel ? (
                <>
                  <clipPath id={`clip-${zona.id}`}>
                    <polygon points={ptsToString(pts)}/>
                  </clipPath>
                  <polygon points={ptsToString(pts)} fill="transparent" stroke={sel?'#1D9E75':'rgba(0,0,0,0.15)'} strokeWidth={sel?3:1}/>
                  {(() => {
                    const minX = Math.min(...pts.map(p=>p.x))
                    const maxX = Math.max(...pts.map(p=>p.x))
                    const minY = Math.min(...pts.map(p=>p.y))
                    const maxY = Math.max(...pts.map(p=>p.y))
                    return (
                      <g clipPath={`url(#clip-${zona.id})`}>
                        <polygon points={`${minX},${minY} ${maxX},${minY} ${minX},${maxY}`} fill={cultiusZona[0].color||'#C0DD97'}/>
                        <polygon points={`${maxX},${minY} ${maxX},${maxY} ${minX},${maxY}`} fill={cultiusZona[1].color||'#FAC775'}/>
                        <polygon points={ptsToString(pts)} fill="transparent" stroke="rgba(0,0,0,0.15)" strokeWidth={1}/>
                      </g>
                    )
                  })()}
                </>
              ) : cultiusZona.length > 2 && !sel ? (
                <>
                  <clipPath id={`clip-${zona.id}`}>
                    <polygon points={ptsToString(pts)}/>
                  </clipPath>
                  {(() => {
                    const minY = Math.min(...pts.map(p=>p.y))
                    const maxY = Math.max(...pts.map(p=>p.y))
                    const minX = Math.min(...pts.map(p=>p.x))
                    const maxX = Math.max(...pts.map(p=>p.x))
                    const alcada = (maxY - minY) / cultiusZona.length
                    return (
                      <g clipPath={`url(#clip-${zona.id})`}>
                        {cultiusZona.map((cu, i) => (
                          <rect key={i} x={minX} y={minY+i*alcada} width={maxX-minX} height={alcada} fill={cu.color||'#C0DD97'}/>
                        ))}
                        <polygon points={ptsToString(pts)} fill="transparent" stroke="rgba(0,0,0,0.15)" strokeWidth={1}/>
                      </g>
                    )
                  })()}
                </>
              ) : (
                <polygon
                  points={ptsToString(pts)}
                  fill={colorZona(zona, cultiusZona, sel)}
                  stroke={sel ? '#1D9E75' : 'rgba(0,0,0,0.15)'}
                  strokeWidth={sel ? 3 : 1}
                />
              )}

              {/* Text */}
              {zona.mostrar_nom !== false && (
                <text
                  x={nomPos.x} y={nomPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={mida}
                  fontWeight={cultiusZona.length > 0 ? 'bold' : 'normal'}
                  fill={sel ? '#042C53' : cultiusZona.length > 0 ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)'}
                  style={{pointerEvents:'none', userSelect:'none'}}>
                  {sel ? zona.codi :
                    cultiusZona.length === 0 ? zona.codi :
                    cultiusZona.length === 1 ? cultiusZona[0].nom :
                    `${cultiusZona.length} cultius`}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip ordinador */}
      {tooltip && !modeMovil && (
        <div style={{
          position:'fixed', left: tooltip.x+14, top: tooltip.y-10,
          background:'rgba(0,0,0,0.85)', color:'white',
          padding:'8px 12px', borderRadius:'8px', fontSize:'12px',
          pointerEvents:'none', zIndex:1000, maxWidth:'220px', lineHeight:'1.6',
        }}>
          <div style={{fontWeight:'600', marginBottom:'4px', fontSize:'13px'}}>Zona {tooltip.zona}</div>
          {tooltip.cultius.length === 0 ? (
            <div style={{color:'#aaa'}}>Sense cultiu actiu</div>
          ) : tooltip.cultius.map((cu, i) => (
            <div key={i} style={{display:'flex', alignItems:'center', gap:'6px'}}>
              <div style={{width:'8px', height:'8px', borderRadius:'2px', background:cu.color||'#ddd', flexShrink:0}}/>
              <span>{cu.nom}{cu.varietat ? ` · ${cu.varietat}` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
