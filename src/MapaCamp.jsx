import { useEffect, useRef } from 'react'
const tooltipRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

export default function MapaCamp({ camp, zones, zonesSeleccionades, onToggleZona, onSeleccionaFila, cultiusActius, dataConsulta, onCanviaData, modeMovil }) {
const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const tooltipRef = useRef(null)

  useEffect(() => { dibuixa() }, [zones, zonesSeleccionades, cultiusActius])

  function estaSeleccionada(zona) {
    return zonesSeleccionades.some(z => z.id === zona.id)
  }

  function getPts(zona) {
    if (zona.forma_geojson?.points) return zona.forma_geojson.points
    return []
  }

  function calcularBbox() {
    const tots = []
    if (camp.zones_geojson?.points) tots.push(...camp.zones_geojson.points)
    zones.forEach(z => tots.push(...getPts(z)))
    if (!tots.length) return { minX:0, minY:0, maxX:1000, maxY:700 }
    return {
      minX: Math.min(...tots.map(p=>p.x)) - 40,
      minY: Math.min(...tots.map(p=>p.y)) - 40,
      maxX: Math.max(...tots.map(p=>p.x)) + 40,
      maxY: Math.max(...tots.map(p=>p.y)) + 40,
    }
  }

  function calcularEscala(bbox, canvasW, canvasH) {
    const sx = canvasW / (bbox.maxX - bbox.minX)
    const sy = canvasH / (bbox.maxY - bbox.minY)
    return Math.min(sx, sy)
  }

  function toCanvas(x, y, bbox, escala) {
    return { cx: (x - bbox.minX) * escala, cy: (y - bbox.minY) * escala }
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

  function dibuixaZonaAmbCultius(ctx, zona, pts, cultius, sel, bbox, escala) {
    if (!pts.length) return

    const canvasPts = pts.map(p => toCanvas(p.x, p.y, bbox, escala))

    if (sel) {
      // Zona seleccionada — color blau
      ctx.beginPath()
      canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.cx,p.cy) : ctx.lineTo(p.cx,p.cy))
      ctx.closePath()
      ctx.fillStyle = '#B5D4F4'
      ctx.fill()
      ctx.strokeStyle = '#1D9E75'
      ctx.lineWidth = 2
      ctx.stroke()
      return
    }

    if (!cultius || cultius.length === 0) {
      ctx.beginPath()
      canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.cx,p.cy) : ctx.lineTo(p.cx,p.cy))
      ctx.closePath()
      ctx.fillStyle = zona.color || '#e8e4de'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 0.5
      ctx.stroke()
      return
    }

    if (cultius.length === 1) {
      // Un cultiu — color sòlid
      ctx.beginPath()
      canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.cx,p.cy) : ctx.lineTo(p.cx,p.cy))
      ctx.closePath()
      ctx.fillStyle = cultius[0].color || '#C0DD97'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 0.5
      ctx.stroke()
      return
    }

    if (cultius.length === 2) {
      // Dos cultius — diagonal
      const minX = Math.min(...canvasPts.map(p=>p.cx))
      const maxX = Math.max(...canvasPts.map(p=>p.cx))
      const minY = Math.min(...canvasPts.map(p=>p.cy))
      const maxY = Math.max(...canvasPts.map(p=>p.cy))

      // Clip al polígon
      ctx.save()
      ctx.beginPath()
      canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.cx,p.cy) : ctx.lineTo(p.cx,p.cy))
      ctx.closePath()
      ctx.clip()

      // Triangle superior esquerra — cultiu 1
      ctx.beginPath()
      ctx.moveTo(minX, minY)
      ctx.lineTo(maxX, minY)
      ctx.lineTo(minX, maxY)
      ctx.closePath()
      ctx.fillStyle = cultius[0].color || '#C0DD97'
      ctx.fill()

      // Triangle inferior dreta — cultiu 2
      ctx.beginPath()
      ctx.moveTo(maxX, minY)
      ctx.lineTo(maxX, maxY)
      ctx.lineTo(minX, maxY)
      ctx.closePath()
      ctx.fillStyle = cultius[1].color || '#FAC775'
      ctx.fill()

      ctx.restore()

      // Vora
      ctx.beginPath()
      canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.cx,p.cy) : ctx.lineTo(p.cx,p.cy))
      ctx.closePath()
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 0.5
      ctx.stroke()
      return
    }

    // 3+ cultius — franges horitzontals
    const minY = Math.min(...canvasPts.map(p=>p.cy))
    const maxY = Math.max(...canvasPts.map(p=>p.cy))
    const alcada = (maxY - minY) / cultius.length

    ctx.save()
    ctx.beginPath()
    canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.cx,p.cy) : ctx.lineTo(p.cx,p.cy))
    ctx.closePath()
    ctx.clip()

    const minX = Math.min(...canvasPts.map(p=>p.cx))
    const maxX = Math.max(...canvasPts.map(p=>p.cx))

    cultius.forEach((c, i) => {
      ctx.fillStyle = c.color || '#C0DD97'
      ctx.fillRect(minX, minY + i*alcada, maxX-minX, alcada)
    })

    ctx.restore()

    ctx.beginPath()
    canvasPts.forEach((p,i) => i===0 ? ctx.moveTo(p.cx,p.cy) : ctx.lineTo(p.cx,p.cy))
    ctx.closePath()
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  function dibuixa() {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const W = container.clientWidth - (modeMovil ? 8 : 32)
    const H = container.clientHeight - (modeMovil ? 20 : 80)
    canvas.width = W
    canvas.height = H

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,W,H)
    ctx.fillStyle = '#f8f7f4'
    ctx.fillRect(0,0,W,H)

    const bbox = calcularBbox()
    const escala = calcularEscala(bbox, W, H)

    // Perímetre
    if (camp.zones_geojson?.points) {
      const pts = camp.zones_geojson.points
      ctx.beginPath()
      pts.forEach((p,i) => {
        const {cx,cy} = toCanvas(p.x,p.y,bbox,escala)
        i===0 ? ctx.moveTo(cx,cy) : ctx.lineTo(cx,cy)
      })
      ctx.closePath()
      ctx.fillStyle = '#f0ede8'
      ctx.fill()
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Zones
    zones.forEach(zona => {
      const pts = getPts(zona)
      if (!pts.length) return
      const sel = estaSeleccionada(zona)
      const cultiusZona = cultiusActius[zona.id] || []

      dibuixaZonaAmbCultius(ctx, zona, pts, cultiusZona, sel, bbox, escala)

      // Text
      if (!modeMovil) {
        const c = centroid(pts)
        const {cx,cy} = toCanvas(c.x,c.y,bbox,escala)
        const amplada = (Math.max(...pts.map(p=>p.x)) - Math.min(...pts.map(p=>p.x))) * escala
        const alcada = (Math.max(...pts.map(p=>p.y)) - Math.min(...pts.map(p=>p.y))) * escala
        const midaText = Math.min(Math.max(8, Math.min(amplada, alcada) * 0.25), 13)

        if (sel) {
          const nomPos = zona.nom_posicio
          const textX = nomPos ? toCanvas(nomPos.x, nomPos.y, bbox, escala).cx : cx
          const textY = nomPos ? toCanvas(nomPos.x, nomPos.y, bbox, escala).cy : cy
          ctx.fillStyle = '#042C53'
          ctx.font = `bold ${midaText}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(zona.codi, textX, textY)
        } else if (cultiusZona.length === 0) {
          const nomPos = zona.nom_posicio
          const textX = nomPos ? toCanvas(nomPos.x, nomPos.y, bbox, escala).cx : cx
          const textY = nomPos ? toCanvas(nomPos.x, nomPos.y, bbox, escala).cy : cy
          ctx.fillStyle = 'rgba(0,0,0,0.3)'
          ctx.font = `${midaText}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(zona.codi, textX, textY)
        } else if (cultiusZona.length === 1) {
          const nomPos = zona.nom_posicio
          const textX = nomPos ? toCanvas(nomPos.x, nomPos.y, bbox, escala).cx : cx
          const textY = nomPos ? toCanvas(nomPos.x, nomPos.y, bbox, escala).cy : cy
          ctx.fillStyle = 'rgba(0,0,0,0.7)'
          ctx.font = `bold ${midaText}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          let text = cultiusZona[0].nom
          while (ctx.measureText(text).width > amplada * 0.85 && text.length > 3) {
            text = text.slice(0,-1)
          }
          if (text !== cultiusZona[0].nom) text += '…'
          ctx.fillText(text, textX, textY)
        } else if (cultiusZona.length === 2) {
          // Dos cultius — text a cada triangle
          const minX = Math.min(...pts.map(p=>p.x)) * escala + (bbox ? -bbox.minX*escala : 0)
          const maxX = Math.max(...pts.map(p=>p.x)) * escala + (bbox ? -bbox.minX*escala : 0)
          const minY = Math.min(...pts.map(p=>p.y)) * escala + (bbox ? -bbox.minY*escala : 0)
          const maxY = Math.max(...pts.map(p=>p.y)) * escala + (bbox ? -bbox.minY*escala : 0)
          const midaTextPetit = Math.max(7, midaText * 0.8)
          ctx.font = `${midaTextPetit}px system-ui`
          ctx.fillStyle = 'rgba(0,0,0,0.7)'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const {cx: cx1, cy: cy1} = toCanvas(
            Math.min(...pts.map(p=>p.x)) + (Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x)))*0.3,
            Math.min(...pts.map(p=>p.y)) + (Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y)))*0.3,
            bbox, escala
          )
          const {cx: cx2, cy: cy2} = toCanvas(
            Math.min(...pts.map(p=>p.x)) + (Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x)))*0.7,
            Math.min(...pts.map(p=>p.y)) + (Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y)))*0.7,
            bbox, escala
          )
          ctx.fillText(cultiusZona[0].nom.substring(0,6), cx1, cy1)
          ctx.fillText(cultiusZona[1].nom.substring(0,6), cx2, cy2)
        } else {
          // 3+ cultius
          ctx.fillStyle = 'rgba(0,0,0,0.5)'
          ctx.font = `${Math.max(7, midaText*0.8)}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${cultiusZona.length} cultius`, cx, cy)
        }
      }
    })
  }

  function getCanvasPos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const cx = (e.clientX - rect.left) * scaleX
    const cy = (e.clientY - rect.top) * scaleY
    const bbox = calcularBbox()
    const escala = calcularEscala(bbox, canvas.width, canvas.height)
    return { x: cx / escala + bbox.minX, y: cy / escala + bbox.minY }
  }
function handleMouseMove(e) {
    if (modeMovil) return
    const {x, y} = getCanvasPos(e)
    
    for (const zona of zones) {
      const pts = getPts(zona)
      if (pts.length && ptInPoly(x, y, pts)) {
        const cultiusZona = cultiusActius[zona.id] || []
        if (cultiusZona.length > 0) {
          setTooltip({
            x: e.clientX,
            y: e.clientY,
            zona: zona.codi,
            cultius: cultiusZona,
          })
        } else {
          setTooltip({ x: e.clientX, y: e.clientY, zona: zona.codi, cultius: [] })
        }
        return
      }
    }
    setTooltip(null)
  }

  function handleMouseLeave() {
    setTooltip(null)
  }
  function handleClick(e) {
    const {x, y} = getCanvasPos(e)
    for (const zona of zones) {
      const pts = getPts(zona)
      if (pts.length && ptInPoly(x, y, pts)) {
        onToggleZona(zona)
        return
      }
    }
  }

  function cultiusUnics() {
    const vistos = {}
    Object.values(cultiusActius).forEach(arr => {
      if (Array.isArray(arr)) {
        arr.forEach(c => { if (c.nom && !vistos[c.nom]) vistos[c.nom] = c.color })
      }
    })
    return vistos
  }

  const llegenda = cultiusUnics()

  return (
    <div ref={containerRef} style={{width:'100%', height:'100%', display:'flex', flexDirection:'column', padding: modeMovil?'4px':'16px', overflow:'hidden'}}>
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
      <canvas ref={canvasRef} onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{cursor:'pointer', borderRadius:'8px', border:'1px solid #ddd', display:'block', flex:1, width:'100%'}}/>
  )
      
}
{tooltip && (
        <div style={{
          position:'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 10,
          background:'rgba(0,0,0,0.85)',
          color:'white',
          padding:'8px 12px',
          borderRadius:'8px',
          fontSize:'12px',
          pointerEvents:'none',
          zIndex:1000,
          maxWidth:'200px',
          lineHeight:'1.5',
        }}>
          <div style={{fontWeight:'600', marginBottom:'4px'}}>Zona {tooltip.zona}</div>
          {tooltip.cultius.length === 0 ? (
            <div style={{color:'#aaa'}}>Sense cultiu actiu</div>
          ) : (
            tooltip.cultius.map((c, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:'6px'}}>
                <div style={{width:'8px', height:'8px', borderRadius:'2px', background:c.color||'#ddd', flexShrink:0}}/>
                <span>{c.nom}{c.varietat && c.varietat !== '-' ? ` · ${c.varietat}` : ''}</span>
              </div>
            ))
          )}
        </div>
      )}
