import { useState, useRef, useMemo } from 'react'

// ✅ Funció matemàtica per detectar si un punt està dins d'una zona
function ptInPoly(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y
    const xj = pts[j].x, yj = pts[j].y
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export default function MapaCamp({ camp, zones, zonesSeleccionades, onToggleZona, cultiusActius, dataConsulta, onCanviaData, modeMovil }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  
  // ✅ CÀLCULS INICIALS MEMOITZATS
  function getPts(zona) {
    if (!zona?.forma_geojson?.points) return []
    return zona.forma_geojson.points
  }

  function calcularBbox() {
    const tots = []
    if (camp?.zones_geojson?.points) tots.push(...camp.zones_geojson.points)
    zones.forEach(z => tots.push(...getPts(z)))
    if (!tots.length) return { minX:0, minY:0, w:1000, h:700 }
    const minX = Math.min(...tots.map(p=>p.x)) - 40
    const minY = Math.min(...tots.map(p=>p.y)) - 40
    const maxX = Math.max(...tots.map(p=>p.x)) + 40
    const maxY = Math.max(...tots.map(p=>p.y)) + 40
    return { minX, minY, w: maxX-minX, h: maxY-minY }
  }

  const bbox = useMemo(() => calcularBbox(), [camp, zones])
  const inicialVb = useMemo(() => `${bbox.minX} ${bbox.minY} ${bbox.w} ${bbox.h}`, [bbox])
  
  // ✅ GESTIÓ PRECISA DE COORDENADES
  const [viewBox, setViewBox] = useState(inicialVb)
  const vbRef = useRef(inicialVb)
  const draggingRef = useRef(false)
  const startPosRef = useRef(null)
  const lastPosRef = useRef(null)
  const touchStartPos = useRef(null)
  const lastTouch = useRef(null)
  const lastDist = useRef(null)
  const isTap = useRef(false)
  const darrerTacteTemps = useRef(0)

  function getSVGCoordinates(clientX, clientY) {
    const svg = svgRef.current
    if (!svg) return null
    try {
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
      return { x: svgP.x, y: svgP.y }
    } catch (e) {
      console.warn('Error calculant coordenades SVG:', e)
      return null
    }
  }

  function ptsToString(pts) {
    return pts.map(p => `${p.x},${p.y}`).join(' ')
  }

  function centroid(pts) {
    if (!pts?.length) return { x: 0, y: 0 }
    return { x: pts.reduce((s,p)=>s+p.x,0)/pts.length, y: pts.reduce((s,p)=>s+p.y,0)/pts.length }
  }

  function colorZona(zona, cultiusZona, sel) {
    if (sel) return '#B5D4F4'
    if (!cultiusZona?.length) return zona?.color || '#e8e4de'
    return cultiusZona[0].color || '#C0DD97'
  }

  function cultiusUnics() {
    const vistos = {}
    Object.values(cultiusActius || {}).forEach(arr => {
      const llista = arr?.tots || (Array.isArray(arr) ? arr : [])
      llista.forEach(c => { if (c?.nom && !vistos[c.nom]) vistos[c.nom] = c.color })
    })
    return vistos
  }

  const llegenda = useMemo(() => cultiusUnics(), [cultiusActius])

  // ✅ ZOOM AMB RODA DEL RATOLÍ
  function handleWheel(e) {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    
    const [vbX, vbY, vbW, vbH] = vbRef.current.split(' ').map(Number)
    const factor = e.deltaY > 0 ? 1.1 : 0.9
    
    const mx = vbX + (e.clientX - rect.left) / rect.width * vbW
    const my = vbY + (e.clientY - rect.top) / rect.height * vbH
    
    const novaW = vbW * factor
    const novaH = vbH * factor
    const novaX = mx - (mx - vbX) * factor
    const novaY = my - (my - vbY) * factor
    
    const nouVb = `${novaX} ${novaY} ${novaW} ${novaH}`
    vbRef.current = nouVb
    setViewBox(nouVb)
  }

  // ✅ INICI CLIC O ARROSSEGAMENT
  function handleMouseDown(e) {
    if (e.button !== 0) return
    if (Date.now() - darrerTacteTemps.current < 800) return
    startPosRef.current = { x: e.clientX, y: e.clientY }
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    draggingRef.current = false
  }

  // ✅ MOVIMENT DEL RATOLÍ
  function handleMouseMove(e) {
    if (!lastPosRef.current || !startPosRef.current) return
    
    const dxTotal = e.clientX - startPosRef.current.x
    const dyTotal = e.clientY - startPosRef.current.y
    
    if (!draggingRef.current && Math.hypot(dxTotal, dyTotal) > 8) {
      draggingRef.current = true
      if (svgRef.current) svgRef.current.style.cursor = 'grabbing'
    }

    if (draggingRef.current) {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const [,, vbW, vbH] = vbRef.current.split(' ').map(Number)
      const parts = vbRef.current.split(' ').map(Number)
      
      const dx = -(e.clientX - lastPosRef.current.x) / rect.width * vbW
      const dy = -(e.clientY - lastPosRef.current.y) / rect.height * vbH
      
      const nouVb = `${parts[0]+dx} ${parts[1]+dy} ${parts[2]} ${parts[3]}`
      vbRef.current = nouVb
      setViewBox(nouVb)
      lastPosRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  // ✅ FINAL DEL CLIC
  function handleMouseUp(e) { 
    if (Date.now() - darrerTacteTemps.current < 800) {
      draggingRef.current = false
      lastPosRef.current = null
      startPosRef.current = null
      return
    }

    if (startPosRef.current) {
      const dxTotal = e.clientX - startPosRef.current.x
      const dyTotal = e.clientY - startPosRef.current.y
      
      if (Math.hypot(dxTotal, dyTotal) < 10) {
        const coords = getSVGCoordinates(e.clientX, e.clientY)
        if (coords) {
          for (const zona of [...zones].sort((a,b) => (b.ordre||0)-(a.ordre||0))) {
            const pts = getPts(zona)
            if (pts.length && ptInPoly(coords.x, coords.y, pts)) {
              onToggleZona(zona)
              break
            }
          }
        }
      }
    }
    draggingRef.current = false
    lastPosRef.current = null
    startPosRef.current = null
    if (svgRef.current) svgRef.current.style.cursor = 'grab'
  }

  // ✅ GESTIÓ DE MOVIMENTS TÀCTILS
  function handleTouchStart(e) {
    darrerTacteTemps.current = Date.now()
    
    if (e.touches.length === 1) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      isTap.current = true
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      lastDist.current = null
    } else if (e.touches.length === 2) {
      isTap.current = false
      lastDist.current = getTouchDist(e.touches)
      lastTouch.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
    }
  }

  function handleTouchMove(e) {
    e.preventDefault()
    darrerTacteTemps.current = Date.now()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const [vbX, vbY, vbW, vbH] = vbRef.current.split(' ').map(Number)

    if (e.touches.length === 1 && lastTouch.current && !lastDist.current) {
      const touch = e.touches[0]
      const distAssegurada = Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y)
      if (distAssegurada > 15) isTap.current = false
      
      const dx = touch.clientX - lastTouch.current.x
      const dy = touch.clientY - lastTouch.current.y
      const dxSvg = -dx / rect.width * vbW
      const dySvg = -dy / rect.height * vbH
      
      const nouVb = `${vbX+dxSvg} ${vbY+dySvg} ${vbW} ${vbH}`
      vbRef.current = nouVb
      setViewBox(nouVb)
      lastTouch.current = { x: touch.clientX, y: touch.clientY }

    } else if (e.touches.length === 2 && lastDist.current !== null) {
      isTap.current = false
      const novaDist = getTouchDist(e.touches)
      const ratio = lastDist.current / novaDist
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const dx = -(cx - lastTouch.current.x) / rect.width * vbW
      const dy = -(cy - lastTouch.current.y) / rect.height * vbH
      const svgCx = vbX + (cx - rect.left) / rect.width * vbW
      const svgCy = vbY + (cy - rect.top) / rect.height * vbH
      const novaW = Math.min(Math.max(vbW * ratio, bbox.w * 0.1), bbox.w * 5)
      const novaH = Math.min(Math.max(vbH * ratio, bbox.h * 0.1), bbox.h * 5)
      const novaX = svgCx - (svgCx - vbX) * ratio + dx
      const novaY = svgCy - (svgCy - vbY) * ratio + dy
      
      const nouVb = `${novaX} ${novaY} ${novaW} ${novaH}`
      vbRef.current = nouVb
      setViewBox(nouVb)
      lastDist.current = novaDist
      lastTouch.current = { x: cx, y: cy }
    }
  }

  function handleTouchEnd(e) {
    darrerTacteTemps.current = Date.now()
    
    if (isTap.current && touchStartPos.current) {
      const touch = e.changedTouches?.[0]
      if (touch) {
        const distFinal = Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y)
        if (distFinal < 20) {
          const coords = getSVGCoordinates(touch.clientX, touch.clientY)
          if (coords) {
            for (const zona of [...zones].sort((a,b) => (b.ordre||0)-(a.ordre||0))) {
              const pts = getPts(zona)
              if (pts.length && ptInPoly(coords.x, coords.y, pts)) {
                onToggleZona(zona)
                break
              }
            }
          }
        }
      }
    }
    
    lastTouch.current = null
    lastDist.current = null
    touchStartPos.current = null
    isTap.current = false
  }

  function getTouchDist(touches) {
    if (!touches?.[0] || !touches?.[1]) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx*dx + dy*dy)
  }

  function resetZoom() {
    vbRef.current = inicialVb
    setViewBox(inicialVb)
  }

  function handleCanviaData(e) {
    const val = e?.target?.value
    if (typeof val !== 'string') return
    if (val && val.length === 10 && typeof onCanviaData === 'function') {
      onCanviaData(val)
    } else if (!val && typeof onCanviaData === 'function') {
      onCanviaData('')
    }
  }

  return (
    <div style={{width:'100%', height:'100%', display:'flex', flexDirection:'column', padding: modeMovil?'0':'16px', overflow:'hidden', position:'relative'}}>
      
      {/* CAPÇALERA ORDINADOR */}
      {!modeMovil && (
        <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px', flexWrap:'wrap', flexShrink:0}}>
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <label style={{fontSize:'12px', color:'#888', fontWeight:'500'}}>Veure estat del:</label>
            <input type="date" value={dataConsulta || ''}
              onChange={handleCanviaData}
              style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px'}}/>
            {dataConsulta && (
              <button onClick={() => onCanviaData?.('')}
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

      {/* CONTROLS SUPERIORS FLOTANTS MÒBIL */}
      {modeMovil && (
        <div style={{position:'absolute', top:'8px', left:'8px', right:'8px', display:'flex', justifyContent:'space-between', zIndex:5, pointerEvents:'none'}}>
          <input type="date" value={dataConsulta || ''}
            onChange={handleCanviaData}
            style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'13px', background:'rgba(255,255,255,0.95)', pointerEvents:'all'}}/>
          {viewBox !== inicialVb && (
            <button onClick={resetZoom}
              style={{padding:'5px 10px', border:'1px solid #ddd', borderRadius:'6px', fontSize:'12px', background:'rgba(255,255,255,0.95)', cursor:'pointer', pointerEvents:'all'}}>
              ↺
            </button>
          )}
        </div>
      )}

      {/* MAPA SVG */}
      <svg
        ref={svgRef}
        viewBox={viewBox}
        style={{
          flex:1, width:'100%',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { draggingRef.current = false; lastPosRef.current = null; setTooltip(null) }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Fons del camp */}
        {camp?.zones_geojson?.points && (
          <polygon
            points={ptsToString(camp.zones_geojson.points)}
            fill="#f0ede8"
            stroke="#ccc"
            strokeWidth="3"
          />
        )}

        {/* Zones d'arbres/cultius */}
        {[...zones].sort((a,b) => (a.ordre||0)-(b.ordre||0)).map(zona => {
          const pts = getPts(zona)
          if (!pts?.length) return null
          const sel = zonesSeleccionades.some(z => z?.id === zona?.id)
          const cultiusZona = cultiusActius?.[zona.id] || []
          const c = centroid(pts)
          const nomPos = zona?.nom_posicio || c
          const amplada = Math.max(...pts.map(p=>p.x)) - Math.min(...pts.map(p=>p.x))
          const mida = Math.min(Math.max(amplada * 0.12, 8), 40)

          return (
            <g key={zona.id}
              onMouseEnter={e => {
                if (modeMovil) return
                const tots = cultiusZona.tots || cultiusZona
                setTooltip({ x: e.clientX, y: e.clientY, zona: zona.codi, cultius: tots || [] })
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{pointerEvents:'visiblePainted'}}>

              {/* Cas 1: Zona mixta amb 2 cultius */}
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
                /* Cas 2: Zona mixta amb més de 2 cultius */
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
                /* Cas 3: Zona d'un sol cultiu o seleccionada */
                <polygon
                  points={ptsToString(pts)}
                  fill={colorZona(zona, cultiusZona, sel)}
                  stroke={sel ? '#1D9E75' : 'rgba(0,0,0,0.15)'}
                  strokeWidth={sel ? 3 : 1}
                />
              )}

              {/* Text identificador */}
              {zona?.mostrar_nom !== false && (
                <text
                  x={nomPos.x} y={nomPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={mida}
                  fontWeight={cultiusZona.length > 0 || sel ? 'bold' : 'normal'}
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

      {/* TOOLTIP EMERGENT (NOMÉS ORDINADOR) */}
      {tooltip && !modeMovil && (
        <div style={{
          position:'fixed', left: tooltip.x+14, top: tooltip.y-10,
          background:'rgba(0,0,0,0.85)', color:'white',
          padding:'8px 12px', borderRadius:'8px', fontSize:'12px',
          pointerEvents:'none', zIndex:1000, maxWidth:'220px', lineHeight:'1.6',
        }}>
          <div style={{fontWeight:'600', marginBottom:'4px', fontSize:'13px'}}>Zona {tooltip.zona}</div>
          {tooltip.cultius?.length === 0 ? (
            <div style={{color:'#aaa'}}>Sense cultiu actiu</div>
          ) : (tooltip.cultius || []).map((cu, i) => (
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
